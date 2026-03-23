import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Category } from '@mirante/database';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly db: DatabaseService) {}

  findAll(userId: string): Promise<Category[]> {
    return this.db.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: { children: true },
    });
  }

  async findOne(id: string, userId: string): Promise<Category> {
    const category = await this.db.category.findFirst({
      where: { id, userId },
      include: { children: true },
    });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    return this.db.category.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        description: dto.description,
        color: dto.color,
        parentId: dto.parentId,
      },
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    await this.findOne(id, userId);
    return this.db.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string): Promise<Category> {
    await this.findOne(id, userId);
    return this.db.category.delete({ where: { id } });
  }
}
