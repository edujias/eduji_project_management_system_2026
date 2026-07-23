import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { SystemRole } from 'src/common/enums';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('activity')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async getActivityReport() {
    return this.usersService.getActivityReport();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async updateRole(@Param('id') id: string, @Body('role') role: SystemRole) {
    return this.usersService.updateUserRole(id, role);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.ADMIN)
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.usersService.updateUserStatus(id, status);
  }
}
