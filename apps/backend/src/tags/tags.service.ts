import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Tag } from '@mirante/database';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Promise<Tag[]> {
    return this.db.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Tag> {
    const tag = await this.db.tag.findUnique({
      where: { id },
    });
    if (!tag) throw new NotFoundException(`Tag ${id} not found`);
    return tag;
  }

  create(dto: CreateTagDto): Promise<Tag> {
    return this.db.tag.create({
      data: {
        name: dto.name,
        color: dto.color,
      },
    });
  }

  async update(id: string, dto: UpdateTagDto): Promise<Tag> {
    await this.findOne(id);
    return this.db.tag.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string): Promise<Tag> {
    await this.findOne(id);
    return this.db.tag.delete({
      where: { id },
    });
  }
}
