import { SetMetadata } from '@nestjs/common';
import { ProjectPermissionLevel } from 'src/common/enums';

export const PROJECT_PERMISSION_KEY = 'project_permission';

export const RequireProjectPermission = (permission: ProjectPermissionLevel) =>
  SetMetadata(PROJECT_PERMISSION_KEY, permission);
