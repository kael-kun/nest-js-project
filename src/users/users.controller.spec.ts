import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUserResponse = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890',
    roles: [{ id: 'role-1', name: 'CITIZEN' }],
    profile_image_url: null,
    is_verified: false,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const mockUsersList = {
    users: [
      mockUserResponse,
      { ...mockUserResponse, id: 'user-uuid-456', email: 'test2@example.com' },
    ],
  };

  const mockEmergencyContacts = [
    {
      id: '1',
      user_id: 'user-uuid-123',
      name: 'Jane',
      phone: '+1234567890',
      relationship: 'Wife',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getEmergencyContacts: jest.fn(),
            addEmergencyContact: jest.fn(),
            removeEmergencyContact: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createDto = {
        email: 'new@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
        phone: '+1234567890',
      };
      usersService.create.mockResolvedValue(mockUserResponse as any);

      const result = await controller.create(createDto as any, null as any);

      expect(usersService.create).toHaveBeenCalledWith(createDto, null);
      expect(result).toEqual(mockUserResponse);
    });

    it('should create user with file', async () => {
      const createDto = {
        email: 'new@example.com',
        password: 'password123',
        first_name: 'New',
        last_name: 'User',
        phone: '+1234567890',
      };
      const file = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;
      usersService.create.mockResolvedValue(mockUserResponse as any);

      await controller.create(createDto as any, file);

      expect(usersService.create).toHaveBeenCalledWith(createDto, file);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      usersService.findAll.mockResolvedValue(mockUsersList as any);

      const result = await controller.findAll();

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockUsersList);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      usersService.findById.mockResolvedValue(mockUserResponse as any);

      const result = await controller.findById('user-uuid-123');

      expect(usersService.findById).toHaveBeenCalledWith('user-uuid-123');
      expect(result).toEqual(mockUserResponse);
    });

    it('should return null when user not found', async () => {
      usersService.findById.mockResolvedValue(undefined);

      const result = await controller.findById('invalid-uuid');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateDto = { first_name: 'Updated' };
      usersService.update.mockResolvedValue({
        ...mockUserResponse,
        ...updateDto,
      } as any);

      const result = await controller.update('user-uuid-123', updateDto as any);

      expect(usersService.update).toHaveBeenCalledWith(
        'user-uuid-123',
        updateDto,
        undefined,
      );
      expect(result.first_name).toBe('Updated');
    });

    it('should update user with file', async () => {
      const updateDto = { first_name: 'Updated' };
      const file = {
        originalname: 'new.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;
      usersService.update.mockResolvedValue(mockUserResponse as any);

      await controller.update('user-uuid-123', updateDto as any, file);

      expect(usersService.update).toHaveBeenCalledWith(
        'user-uuid-123',
        updateDto,
        file,
      );
    });
  });

  describe('remove', () => {
    it('should deactivate user', async () => {
      usersService.remove.mockResolvedValue();

      await controller.remove('user-uuid-123');

      expect(usersService.remove).toHaveBeenCalledWith('user-uuid-123');
    });
  });

  describe('getEmergencyContacts', () => {
    it('should return emergency contacts', async () => {
      usersService.getEmergencyContacts.mockResolvedValue(
        mockEmergencyContacts as any,
      );

      const result = await controller.getEmergencyContacts('user-uuid-123');

      expect(usersService.getEmergencyContacts).toHaveBeenCalledWith(
        'user-uuid-123',
      );
      expect(result).toEqual(mockEmergencyContacts);
    });
  });

  describe('addEmergencyContact', () => {
    it('should add emergency contact', async () => {
      const dto = { name: 'Jane', phone: '+1234567890', relationship: 'Wife' };
      usersService.addEmergencyContact.mockResolvedValue(
        mockEmergencyContacts[0] as any,
      );

      const result = await controller.addEmergencyContact(
        'user-uuid-123',
        dto as any,
      );

      expect(usersService.addEmergencyContact).toHaveBeenCalledWith(
        'user-uuid-123',
        dto,
      );
      expect(result).toEqual(mockEmergencyContacts[0]);
    });
  });

  describe('removeEmergencyContact', () => {
    it('should remove emergency contact', async () => {
      usersService.removeEmergencyContact.mockResolvedValue();

      await controller.removeEmergencyContact('user-uuid-123', 'contact-1');

      expect(usersService.removeEmergencyContact).toHaveBeenCalledWith(
        'contact-1',
        'user-uuid-123',
      );
    });
  });
});
