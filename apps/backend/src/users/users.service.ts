import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { User, Prisma } from '@mirante/database';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Promise<User[]> {
    return this.db.user.findMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.db.user.create({ data });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.findOne(id);
    return this.db.user.update({
      where: { id },
      data,
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async remove(id: string): Promise<User> {
    await this.findOne(id);
    return this.db.user.delete({ where: { id } });
  }
}
