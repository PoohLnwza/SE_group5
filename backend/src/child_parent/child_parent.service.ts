import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChildParentService {
  constructor(private readonly prisma: PrismaService) {}

  async getLinkContext(user: {
    user_id: number;
    user_type: 'staff' | 'parent';
    roleNames?: string[];
    staffRole?: string | null;
  }) {
    this.ensureStaffAccess(user);

    const [parents, children] = await Promise.all([
      this.prisma.parent.findMany({
        where: { deleted_at: null },
        select: {
          parent_id: true,
          first_name: true,
          last_name: true,
          phone: true,
          users: {
            select: {
              user_id: true,
              username: true,
            },
          },
          _count: {
            select: {
              child_parent: true,
            },
          },
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
      }),
      this.prisma.child.findMany({
        where: { deleted_at: null },
        select: {
          child_id: true,
          first_name: true,
          last_name: true,
          birth_date: true,
          _count: {
            select: {
              child_parent: true,
            },
          },
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
      }),
    ]);

    return { parents, children };
  }

  async getLinks(user: {
    user_id: number;
    user_type: 'staff' | 'parent';
    roleNames?: string[];
    staffRole?: string | null;
  }) {
    if (user.user_type === 'parent') {
      const parent = await this.getParentProfileByUserId(user.user_id);
      return this.getParentWithChildren(parent.parent_id);
    }

    this.ensureStaffAccess(user);

    return this.prisma.parent.findMany({
      where: { deleted_at: null },
      include: {
        users: {
          select: {
            user_id: true,
            username: true,
          },
        },
        child_parent: {
          include: {
            child: {
              select: {
                child_id: true,
                first_name: true,
                last_name: true,
                birth_date: true,
                deleted_at: true,
              },
            },
          },
        },
      },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    });
  }

  async linkChildToParent(
    user: {
      user_id: number;
      user_type: 'staff' | 'parent';
      roleNames?: string[];
      staffRole?: string | null;
    },
    payload: { child_id: number; parent_id?: number },
  ) {
    if (!Number.isInteger(payload.child_id)) {
      throw new BadRequestException('child_id is required');
    }

    let parentId = payload.parent_id;
    if (user.user_type === 'parent') {
      const parent = await this.getParentProfileByUserId(user.user_id);
      parentId = parent.parent_id;
    } else {
      this.ensureStaffAccess(user);
    }

    if (!Number.isInteger(parentId)) {
      throw new BadRequestException('parent_id is required');
    }

    const [parent, child] = await Promise.all([
      this.prisma.parent.findFirst({
        where: {
          parent_id: Number(parentId),
          deleted_at: null,
        },
        select: {
          parent_id: true,
          first_name: true,
          last_name: true,
          user_id: true,
        },
      }),
      this.prisma.child.findFirst({
        where: {
          child_id: payload.child_id,
          deleted_at: null,
        },
        select: {
          child_id: true,
          first_name: true,
          last_name: true,
          birth_date: true,
        },
      }),
    ]);

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    if (user.user_type === 'parent' && parent.user_id !== user.user_id) {
      throw new ForbiddenException(
        'You can only link children to your own parent profile',
      );
    }

    const existingLink = await this.prisma.child_parent.findUnique({
      where: {
        child_id_parent_id: {
          child_id: payload.child_id,
          parent_id: Number(parentId),
        },
      },
    });

    if (existingLink) {
      throw new BadRequestException(
        'This child is already linked to the selected parent',
      );
    }

    await this.prisma.child_parent.create({
      data: {
        child_id: payload.child_id,
        parent_id: Number(parentId),
      },
    });

    return this.getParentWithChildren(Number(parentId));
  }

  async unlinkChildFromParent(
    user: {
      user_id: number;
      user_type: 'staff' | 'parent';
      roleNames?: string[];
      staffRole?: string | null;
    },
    childId: number,
    parentId?: number,
  ) {
    if (!Number.isInteger(childId)) {
      throw new BadRequestException('child_id is required');
    }

    let resolvedParentId = parentId;
    if (user.user_type === 'parent') {
      const parent = await this.getParentProfileByUserId(user.user_id);
      resolvedParentId = parent.parent_id;
    } else {
      this.ensureStaffAccess(user);
    }

    if (!Number.isInteger(resolvedParentId)) {
      throw new BadRequestException('parent_id is required');
    }

    const existingLink = await this.prisma.child_parent.findUnique({
      where: {
        child_id_parent_id: {
          child_id: childId,
          parent_id: Number(resolvedParentId),
        },
      },
    });

    if (!existingLink) {
      throw new NotFoundException('Child-parent link not found');
    }

    await this.prisma.child_parent.delete({
      where: {
        child_id_parent_id: {
          child_id: childId,
          parent_id: Number(resolvedParentId),
        },
      },
    });

    return this.getParentWithChildren(Number(resolvedParentId));
  }

  private async getParentProfileByUserId(userId: number) {
    const parent = await this.prisma.parent.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      select: {
        parent_id: true,
        user_id: true,
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent profile not found');
    }

    return parent;
  }

  private async getParentWithChildren(parentId: number) {
    const parent = await this.prisma.parent.findFirst({
      where: {
        parent_id: parentId,
        deleted_at: null,
      },
      include: {
        users: {
          select: {
            user_id: true,
            username: true,
          },
        },
        child_parent: {
          include: {
            child: {
              select: {
                child_id: true,
                first_name: true,
                last_name: true,
                birth_date: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    return {
      parent: {
        parent_id: parent.parent_id,
        first_name: parent.first_name,
        last_name: parent.last_name,
        phone: parent.phone,
        user: parent.users,
      },
      children: parent.child_parent
        .map((item) => item.child)
        .filter((child): child is NonNullable<typeof child> => Boolean(child)),
    };
  }

  private ensureStaffAccess(user: {
    user_type: 'staff' | 'parent';
    roleNames?: string[];
    staffRole?: string | null;
  }) {
    if (user.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }

    const roleSet = new Set<string>([
      ...(user.staffRole ? [user.staffRole] : []),
      ...(user.roleNames ?? []),
    ]);

    if (roleSet.has('admin')) {
      return;
    }

    const allowedRoles = new Set(['nurse', 'doctor', 'psychiatrist']);
    if ([...roleSet].some((role) => allowedRoles.has(role))) {
      return;
    }

    throw new ForbiddenException('Insufficient role permissions');
  }
}
