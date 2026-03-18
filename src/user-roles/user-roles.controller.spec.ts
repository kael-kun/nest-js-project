import { Test, TestingModule } from '@nestjs/testing';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';
import { UsersService } from '../users/users.service';

describe('UserRolesController', () => {
  let controller: UserRolesController;
  let userRolesService: jest.Mocked<UserRolesService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRolesController],
      providers: [
        {
          provide: UserRolesService,
          useValue: {
            addRole: jest.fn(),
            removeRole: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            updateUserRoles: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserRolesController>(UserRolesController);
    userRolesService = module.get(UserRolesService);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addRole', () => {
    it('should add role to user successfully', async () => {
      const dto = { user_id: 'user-uuid-123', role_id: 'role-uuid-456' };
      const mockResponse = {
        id: 'user-role-uuid',
        user_id: 'user-uuid-123',
        role_id: 'role-uuid-456',
        role_name: 'CITIZEN',
        created_at: new Date().toISOString(),
      };
      userRolesService.addRole.mockResolvedValue(mockResponse as any);

      const result = await controller.addRole(dto as any);

      expect(userRolesService.addRole).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when service fails', async () => {
      const dto = { user_id: 'user-uuid-123', role_id: 'role-uuid-456' };
      userRolesService.addRole.mockRejectedValue(new Error('User not found'));

      await expect(controller.addRole(dto as any)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const userRoleId = 'user-role-uuid';
      const body = { role_id: 'role-uuid-456' };
      usersService.updateUserRoles.mockResolvedValue();

      const result = await controller.updateUserRole(userRoleId, body as any);

      expect(usersService.updateUserRoles).toHaveBeenCalledWith(
        userRoleId,
        body.role_id,
      );
      expect(result).toEqual({ message: 'Role updated successfully' });
    });

    it('should throw error when service fails', async () => {
      const userRoleId = 'user-role-uuid';
      const body = { role_id: 'role-uuid-456' };
      usersService.updateUserRoles.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(
        controller.updateUserRole(userRoleId, body as any),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('removeRole', () => {
    it('should remove role from user successfully', async () => {
      const userRoleId = 'user-role-uuid';
      userRolesService.removeRole.mockResolvedValue({
        message: 'Role removed successfully',
      } as any);

      const result = await controller.removeRole(userRoleId);

      expect(userRolesService.removeRole).toHaveBeenCalledWith(userRoleId);
      expect(result).toEqual({ message: 'Role removed successfully' });
    });

    it('should throw error when service fails', async () => {
      const userRoleId = 'user-role-uuid';
      userRolesService.removeRole.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.removeRole(userRoleId)).rejects.toThrow(
        'Delete failed',
      );
    });
  });
});
