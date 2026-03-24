import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const roleSet = new Set<string>([
      ...(user.staffRole ? [user.staffRole] : []),
      ...(user.roleNames ?? []),
    ]);

    if (roleSet.has('admin')) {
      return true;
    }

    const normalizedRoles = new Set<string>();
    for (const role of roleSet) {
      normalizedRoles.add(role);
      if (role === 'doctor' || role === 'psychiatrist') {
        normalizedRoles.add('doctor');
        normalizedRoles.add('psychiatrist');
      }
    }

    const hasAccess = requiredRoles.some((role) => normalizedRoles.has(role));
    if (!hasAccess) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return hasAccess;
  }
}
