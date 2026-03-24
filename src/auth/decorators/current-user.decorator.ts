import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return userId;
  },
);