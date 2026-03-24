import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AuthUser = {
  user_id: number;
  user_type: 'staff' | 'parent';
  staffRole?: string | null;
  roleNames?: string[];
};

type AssessmentChoiceInput = {
  choice_id?: number;
  choice_text: string;
  score: number;
};

type AssessmentQuestionInput = {
  question_id?: number;
  question_text: string;
  choices: AssessmentChoiceInput[];
};

type AssessmentBandInput = {
  band_id?: number;
  min_score: number;
  max_score: number;
  severity_level: 'normal' | 'mild' | 'moderate' | 'severe';
  interpretation_text: string;
  recommendation_text?: string | null;
};

type AssessmentTemplateInput = {
  name: string;
  questions: AssessmentQuestionInput[];
  scoreBands: AssessmentBandInput[];
};

type AssessmentSubmissionInput = {
  assessment_id: number;
  child_id: number;
  answers: Array<{
    question_id: number;
    choice_id: number;
  }>;
};

@Injectable()
export class AssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: AuthUser) {
    if (user.user_type === 'parent') {
      const parent = await this.prisma.parent.findFirst({
        where: { user_id: user.user_id },
        include: {
          child_parent: {
            include: {
              child: {
                select: {
                  child_id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
      });

      const childIds = parent?.child_parent.map((item) => item.child_id) ?? [];
      const [templates, totalResults, results] = await Promise.all([
        this.prisma.assessment.findMany({
          include: {
            _count: {
              select: {
                question: true,
              },
            },
          },
          orderBy: { assessment_id: 'asc' },
        }),
        this.prisma.child_assessment.count({
          where: {
            child_id: { in: childIds.length > 0 ? childIds : [-1] },
          },
        }),
        this.prisma.child_assessment.findMany({
          where: {
            child_id: { in: childIds.length > 0 ? childIds : [-1] },
          },
          include: this.resultInclude(),
          orderBy: { assessed_at: 'desc' },
          take: 8,
        }),
      ]);

      return {
        summary: {
          totalChildren: childIds.length,
          totalTemplates: templates.length,
          totalResults,
        },
        children:
          parent?.child_parent
            .map((item) => item.child)
            .filter((child): child is NonNullable<typeof child> =>
              Boolean(child),
            ) ?? [],
        templates: templates.map((template) =>
          this.mapTemplateSummary(template),
        ),
        recentResults: results.map((result) => this.mapResult(result)),
      };
    }

    this.ensureStaff(user);

    const [templates, totalResults, distinctChildren, recentResults] =
      await Promise.all([
        this.prisma.assessment.findMany({
          include: {
            _count: {
              select: {
                question: true,
                child_assessment: true,
              },
            },
            staff: {
              select: {
                staff_id: true,
                first_name: true,
                last_name: true,
                role: true,
              },
            },
          },
          orderBy: { assessment_id: 'asc' },
        }),
        this.prisma.child_assessment.count(),
        this.prisma.child_assessment.findMany({
          distinct: ['child_id'],
          select: {
            child_id: true,
          },
        }),
        this.prisma.child_assessment.findMany({
          include: this.resultInclude(),
          orderBy: { assessed_at: 'desc' },
          take: 8,
        }),
      ]);

    return {
      summary: {
        totalTemplates: templates.length,
        totalResults,
        totalChildrenAssessed: distinctChildren.filter((item) => item.child_id)
          .length,
      },
      templates: templates.map((template) => this.mapTemplateSummary(template)),
      recentResults: recentResults.map((result) => this.mapResult(result)),
    };
  }

  async getTemplates(_user: AuthUser) {
    const templates = await this.prisma.assessment.findMany({
      include: {
        staff: {
          select: {
            staff_id: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
        _count: {
          select: {
            question: true,
            child_assessment: true,
          },
        },
      },
      orderBy: { assessment_id: 'asc' },
    });

    return templates.map((template) => this.mapTemplateSummary(template));
  }

  async getTemplateById(_user: AuthUser, assessmentId: number) {
    const template = await this.prisma.assessment.findUnique({
      where: { assessment_id: assessmentId },
      include: this.templateInclude(),
    });

    if (!template) {
      throw new NotFoundException('Assessment template not found');
    }

    return this.mapTemplateDetail(template);
  }

  async createTemplate(user: AuthUser, input: AssessmentTemplateInput) {
    const staff = await this.ensureTemplateManager(user);
    const normalized = this.validateTemplateInput(input);

    const created = await this.prisma.$transaction(async (tx) => {
      const template = await tx.assessment.create({
        data: {
          name: normalized.name,
          created_by: staff.staff_id,
        },
      });

      for (const band of normalized.scoreBands) {
        await tx.assessment_score_band.create({
          data: {
            assessment_id: template.assessment_id,
            min_score: band.min_score,
            max_score: band.max_score,
            severity_level: band.severity_level,
            interpretation_text: band.interpretation_text,
            recommendation_text: band.recommendation_text ?? null,
          },
        });
      }

      for (const question of normalized.questions) {
        const createdQuestion = await tx.question.create({
          data: {
            assessment_id: template.assessment_id,
            question_text: question.question_text,
          },
        });

        for (const choice of question.choices) {
          await tx.choice.create({
            data: {
              question_id: createdQuestion.question_id,
              choice_text: choice.choice_text,
              score: choice.score,
            },
          });
        }
      }

      return tx.assessment.findUnique({
        where: { assessment_id: template.assessment_id },
        include: this.templateInclude(),
      });
    });

    if (!created) {
      throw new NotFoundException('Unable to load created assessment');
    }

    return this.mapTemplateDetail(created);
  }

  async updateTemplate(
    user: AuthUser,
    assessmentId: number,
    input: AssessmentTemplateInput,
  ) {
    await this.ensureTemplateManager(user);
    const existing = await this.prisma.assessment.findUnique({
      where: { assessment_id: assessmentId },
      include: {
        child_assessment: {
          select: { child_assessment_id: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Assessment template not found');
    }

    if (existing.child_assessment.length > 0) {
      throw new BadRequestException(
        'This assessment already has submitted results and cannot be edited',
      );
    }

    const normalized = this.validateTemplateInput(input);

    const updated = await this.prisma.$transaction(async (tx) => {
      const existingQuestionIds = await tx.question.findMany({
        where: { assessment_id: assessmentId },
        select: { question_id: true },
      });

      await tx.assessment.update({
        where: { assessment_id: assessmentId },
        data: {
          name: normalized.name,
        },
      });

      await tx.assessment_score_band.deleteMany({
        where: { assessment_id: assessmentId },
      });
      await tx.choice.deleteMany({
        where: {
          question_id: {
            in: existingQuestionIds.map((question) => question.question_id),
          },
        },
      });
      await tx.question.deleteMany({
        where: { assessment_id: assessmentId },
      });

      for (const band of normalized.scoreBands) {
        await tx.assessment_score_band.create({
          data: {
            assessment_id: assessmentId,
            min_score: band.min_score,
            max_score: band.max_score,
            severity_level: band.severity_level,
            interpretation_text: band.interpretation_text,
            recommendation_text: band.recommendation_text ?? null,
          },
        });
      }

      for (const question of normalized.questions) {
        const createdQuestion = await tx.question.create({
          data: {
            assessment_id: assessmentId,
            question_text: question.question_text,
          },
        });

        for (const choice of question.choices) {
          await tx.choice.create({
            data: {
              question_id: createdQuestion.question_id,
              choice_text: choice.choice_text,
              score: choice.score,
            },
          });
        }
      }

      return tx.assessment.findUnique({
        where: { assessment_id: assessmentId },
        include: this.templateInclude(),
      });
    });

    if (!updated) {
      throw new NotFoundException('Unable to load updated assessment');
    }

    return this.mapTemplateDetail(updated);
  }

  async deleteTemplate(user: AuthUser, assessmentId: number) {
    await this.ensureTemplateManager(user);
    const existing = await this.prisma.assessment.findUnique({
      where: { assessment_id: assessmentId },
      include: {
        child_assessment: {
          select: { child_assessment_id: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Assessment template not found');
    }

    if (existing.child_assessment.length > 0) {
      throw new BadRequestException(
        'This assessment already has submitted results and cannot be deleted',
      );
    }

    await this.prisma.assessment.delete({
      where: { assessment_id: assessmentId },
    });

    return { deleted: true };
  }

  async getParentContext(user: AuthUser) {
    if (user.user_type !== 'parent') {
      throw new ForbiddenException('Parent access required');
    }

    const parent = await this.prisma.parent.findFirst({
      where: { user_id: user.user_id },
      include: {
        child_parent: {
          include: {
            child: {
              select: {
                child_id: true,
                first_name: true,
                last_name: true,
                birth_date: true,
              },
            },
          },
        },
      },
    });

    const templates = await this.getTemplates(user);
    return {
      children:
        parent?.child_parent
          .map((item) => item.child)
          .filter((child): child is NonNullable<typeof child> =>
            Boolean(child),
          ) ?? [],
      templates,
    };
  }

  async submitAssessment(user: AuthUser, input: AssessmentSubmissionInput) {
    const normalized = this.validateSubmissionInput(input);

    const template = await this.prisma.assessment.findUnique({
      where: { assessment_id: normalized.assessment_id },
      include: this.templateInclude(),
    });

    if (!template) {
      throw new NotFoundException('Assessment template not found');
    }

    const child = await this.prisma.child.findUnique({
      where: { child_id: normalized.child_id },
      select: {
        child_id: true,
        first_name: true,
        last_name: true,
      },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    if (user.user_type === 'parent') {
      const parent = await this.prisma.parent.findFirst({
        where: { user_id: user.user_id },
        include: {
          child_parent: {
            select: {
              child_id: true,
            },
          },
        },
      });

      const childIds = parent?.child_parent.map((item) => item.child_id) ?? [];
      if (!childIds.includes(normalized.child_id)) {
        throw new ForbiddenException(
          'You can only submit an assessment for your own child',
        );
      }
    }

    const questionMap = new Map(
      template.question.map((question) => [question.question_id, question]),
    );
    if (normalized.answers.length !== template.question.length) {
      throw new BadRequestException('Every question must have an answer');
    }

    let totalScore = 0;
    const answerRows = normalized.answers.map((answer) => {
      const question = questionMap.get(answer.question_id);
      if (!question) {
        throw new BadRequestException('Invalid question in submission');
      }

      const choice = question.choice.find(
        (item) => item.choice_id === answer.choice_id,
      );
      if (!choice) {
        throw new BadRequestException('Invalid choice for submitted question');
      }

      totalScore += Number(choice.score ?? 0);
      return {
        question_id: question.question_id,
        choice_id: choice.choice_id,
        score: Number(choice.score ?? 0),
      };
    });

    const matchingBand = template.assessment_score_band.find(
      (band) => totalScore >= band.min_score && totalScore <= band.max_score,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const result = await tx.child_assessment.create({
        data: {
          child_id: normalized.child_id,
          assessment_id: normalized.assessment_id,
          total_score: totalScore,
          interpreted_band_id: matchingBand?.band_id ?? null,
          interpreted_text: matchingBand?.interpretation_text ?? null,
        },
      });

      for (const answer of answerRows) {
        await tx.assessment_answer.create({
          data: {
            child_assessment_id: result.child_assessment_id,
            question_id: answer.question_id,
            choice_id: answer.choice_id,
            score: answer.score,
          },
        });
      }

      return tx.child_assessment.findUnique({
        where: { child_assessment_id: result.child_assessment_id },
        include: this.resultInclude(),
      });
    });

    if (!created) {
      throw new NotFoundException('Unable to load created result');
    }

    return this.mapResult(created);
  }

  async getResults(user: AuthUser, childId?: number, assessmentId?: number) {
    const where: Record<string, unknown> = {};

    if (assessmentId) {
      where.assessment_id = assessmentId;
    }

    if (user.user_type === 'parent') {
      const parent = await this.prisma.parent.findFirst({
        where: { user_id: user.user_id },
        include: {
          child_parent: {
            select: {
              child_id: true,
            },
          },
        },
      });

      const childIds = parent?.child_parent.map((item) => item.child_id) ?? [];
      if (childId && !childIds.includes(childId)) {
        throw new ForbiddenException('You do not have access to this child');
      }

      where.child_id = {
        in: childId ? [childId] : childIds.length > 0 ? childIds : [-1],
      };
    } else if (childId) {
      where.child_id = childId;
    }

    const results = await this.prisma.child_assessment.findMany({
      where,
      include: this.resultInclude(),
      orderBy: { assessed_at: 'desc' },
    });

    return results.map((result) => this.mapResult(result));
  }

  async getResultById(user: AuthUser, resultId: number) {
    const result = await this.prisma.child_assessment.findUnique({
      where: { child_assessment_id: resultId },
      include: this.resultInclude(),
    });

    if (!result) {
      throw new NotFoundException('Assessment result not found');
    }

    if (user.user_type === 'parent') {
      const parent = await this.prisma.parent.findFirst({
        where: { user_id: user.user_id },
        include: {
          child_parent: {
            select: {
              child_id: true,
            },
          },
        },
      });

      const childIds = parent?.child_parent.map((item) => item.child_id) ?? [];
      if (!childIds.includes(Number(result.child_id))) {
        throw new ForbiddenException(
          'You do not have access to this assessment result',
        );
      }
    }

    return this.mapResult(result);
  }

  private resultInclude() {
    return {
      child: {
        select: {
          child_id: true,
          first_name: true,
          last_name: true,
          birth_date: true,
        },
      },
      assessment: {
        select: {
          assessment_id: true,
          name: true,
        },
      },
      assessment_score_band: {
        select: {
          band_id: true,
          severity_level: true,
          min_score: true,
          max_score: true,
          interpretation_text: true,
          recommendation_text: true,
        },
      },
      assessment_answer: {
        include: {
          question: {
            select: {
              question_id: true,
              question_text: true,
            },
          },
          choice: {
            select: {
              choice_id: true,
              choice_text: true,
              score: true,
            },
          },
        },
        orderBy: {
          question_id: 'asc',
        },
      },
    };
  }

  private templateInclude() {
    return {
      staff: {
        select: {
          staff_id: true,
          first_name: true,
          last_name: true,
          role: true,
        },
      },
      question: {
        orderBy: { question_id: 'asc' as const },
        include: {
          choice: {
            orderBy: { choice_id: 'asc' as const },
          },
        },
      },
      assessment_score_band: {
        orderBy: [{ min_score: 'asc' as const }, { max_score: 'asc' as const }],
      },
      _count: {
        select: {
          child_assessment: true,
          question: true,
        },
      },
    };
  }

  private mapTemplateSummary(template: any) {
    return {
      assessment_id: template.assessment_id,
      name: template.name,
      created_by: template.created_by ?? template.staff?.staff_id ?? null,
      creator: template.staff
        ? {
            ...template.staff,
            role: this.toPublicRoleName(template.staff.role),
          }
        : null,
      questionCount:
        template._count?.question ?? template.question?.length ?? 0,
      resultCount:
        template._count?.child_assessment ??
        template.child_assessment?.length ??
        0,
    };
  }

  private mapTemplateDetail(template: any) {
    return {
      ...this.mapTemplateSummary(template),
      scoreBands: template.assessment_score_band.map((band: any) => ({
        band_id: band.band_id,
        min_score: band.min_score,
        max_score: band.max_score,
        severity_level: band.severity_level,
        interpretation_text: band.interpretation_text,
        recommendation_text: band.recommendation_text,
      })),
      questions: template.question.map((question: any) => ({
        question_id: question.question_id,
        question_text: question.question_text,
        choices: question.choice.map((choice: any) => ({
          choice_id: choice.choice_id,
          choice_text: choice.choice_text,
          score: choice.score,
        })),
      })),
    };
  }

  private mapResult(result: any) {
    return {
      child_assessment_id: result.child_assessment_id,
      total_score: result.total_score,
      interpreted_text: result.interpreted_text,
      assessed_at: result.assessed_at,
      child: result.child,
      assessment: result.assessment,
      band: result.assessment_score_band,
      answers: result.assessment_answer.map((answer: any) => ({
        answer_id: answer.answer_id,
        score: answer.score,
        question: answer.question,
        choice: answer.choice,
      })),
    };
  }

  private validateTemplateInput(input: AssessmentTemplateInput) {
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('Assessment name is required');
    }

    if (!Array.isArray(input.questions) || input.questions.length === 0) {
      throw new BadRequestException('At least one question is required');
    }

    if (!Array.isArray(input.scoreBands) || input.scoreBands.length === 0) {
      throw new BadRequestException('At least one score band is required');
    }

    const questions = input.questions.map((question, index) => {
      const questionText = question.question_text?.trim();
      if (!questionText) {
        throw new BadRequestException(`Question ${index + 1} is missing text`);
      }

      if (!Array.isArray(question.choices) || question.choices.length < 2) {
        throw new BadRequestException(
          `Question ${index + 1} must have at least two choices`,
        );
      }

      const choices = question.choices.map((choice, choiceIndex) => {
        const choiceText = choice.choice_text?.trim();
        if (!choiceText) {
          throw new BadRequestException(
            `Choice ${choiceIndex + 1} in question ${index + 1} is missing text`,
          );
        }

        if (!Number.isInteger(choice.score)) {
          throw new BadRequestException(
            `Choice ${choiceIndex + 1} in question ${index + 1} must have an integer score`,
          );
        }

        return {
          choice_text: choiceText,
          score: choice.score,
        };
      });

      return {
        question_text: questionText,
        choices,
      };
    });

    const scoreBands = [...input.scoreBands]
      .map((band, index) => {
        const interpretationText = band.interpretation_text?.trim();
        if (
          !Number.isInteger(band.min_score) ||
          !Number.isInteger(band.max_score)
        ) {
          throw new BadRequestException(
            `Score band ${index + 1} must have integer score boundaries`,
          );
        }

        if (band.min_score > band.max_score) {
          throw new BadRequestException(
            `Score band ${index + 1} has an invalid score range`,
          );
        }

        if (!interpretationText) {
          throw new BadRequestException(
            `Score band ${index + 1} is missing interpretation text`,
          );
        }

        return {
          min_score: band.min_score,
          max_score: band.max_score,
          severity_level: band.severity_level,
          interpretation_text: interpretationText,
          recommendation_text: band.recommendation_text?.trim() || null,
        };
      })
      .sort((left, right) => left.min_score - right.min_score);

    for (let index = 1; index < scoreBands.length; index += 1) {
      if (scoreBands[index].min_score <= scoreBands[index - 1].max_score) {
        throw new BadRequestException('Score band ranges cannot overlap');
      }
    }

    return {
      name,
      questions,
      scoreBands,
    };
  }

  private validateSubmissionInput(input: AssessmentSubmissionInput) {
    if (!Number.isInteger(input.assessment_id)) {
      throw new BadRequestException('assessment_id is required');
    }

    if (!Number.isInteger(input.child_id)) {
      throw new BadRequestException('child_id is required');
    }

    if (!Array.isArray(input.answers) || input.answers.length === 0) {
      throw new BadRequestException('answers are required');
    }

    const seenQuestions = new Set<number>();
    const answers = input.answers.map((answer) => {
      if (
        !Number.isInteger(answer.question_id) ||
        !Number.isInteger(answer.choice_id)
      ) {
        throw new BadRequestException(
          'Each answer must include question_id and choice_id',
        );
      }

      if (seenQuestions.has(answer.question_id)) {
        throw new BadRequestException('Duplicate answers are not allowed');
      }
      seenQuestions.add(answer.question_id);

      return answer;
    });

    return {
      assessment_id: input.assessment_id,
      child_id: input.child_id,
      answers,
    };
  }

  private async ensureTemplateManager(user: AuthUser) {
    this.ensureStaff(user);
    if (!this.hasRole(user, ['admin', 'doctor', 'psychologist'])) {
      throw new ForbiddenException(
        'This role cannot manage assessment templates',
      );
    }

    const staff = await this.prisma.staff.findFirst({
      where: { user_id: user.user_id },
      select: {
        staff_id: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found');
    }

    return staff;
  }

  private ensureStaff(user: AuthUser) {
    if (user.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }
  }

  private hasRole(user: AuthUser, roles: string[]) {
    const roleSet = new Set<string>([
      ...(user.staffRole ? [user.staffRole] : []),
      ...(user.roleNames ?? []),
    ]);

    if (roleSet.has('admin')) {
      return true;
    }

    return roles.some((role) => {
      if (role === 'doctor') {
        return roleSet.has('doctor') || roleSet.has('psychiatrist');
      }

      if (role === 'psychiatrist') {
        return roleSet.has('doctor') || roleSet.has('psychiatrist');
      }

      return roleSet.has(role);
    });
  }

  private toPublicRoleName(roleName?: string | null) {
    if (!roleName) {
      return null;
    }

    return roleName === 'psychiatrist' ? 'doctor' : roleName;
  }
}
