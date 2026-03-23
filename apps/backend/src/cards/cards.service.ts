import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Card, Prisma } from '@mirante/database';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(userId: string): Promise<Card[]> {
    return this.db.card.findMany({
      where: { userId, isActive: true },
      orderBy: { name: 'asc' },
      include: { account: true },
    });
  }

  async findOne(id: string, userId: string): Promise<Card> {
    const card = await this.db.card.findFirst({
      where: { id, userId, isActive: true },
      include: { account: true },
    });
    if (!card) throw new NotFoundException(`Card ${id} not found`);
    return card;
  }

  create(userId: string, dto: CreateCardDto): Promise<Card> {
    return this.db.card.create({
      data: {
        userId,
        accountId: dto.accountId,
        name: dto.name,
        brand: dto.brand,
        last4: dto.last4,
        type: dto.type,
        creditLimit:
          dto.type === 'CREDIT' && dto.creditLimit !== undefined
            ? new Prisma.Decimal(dto.creditLimit)
            : null,
        color: dto.color,
        icon: dto.icon,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
      },
      include: { account: true },
    });
  }

  async update(id: string, userId: string, dto: UpdateCardDto): Promise<Card> {
    await this.findOne(id, userId);

    return this.db.card.update({
      where: { id },
      data: {
        name: dto.name,
        brand: dto.brand,
        last4: dto.last4,
        type: dto.type,
        creditLimit:
          dto.type === 'CREDIT' && dto.creditLimit !== undefined
            ? new Prisma.Decimal(dto.creditLimit)
            : dto.type === 'DEBIT'
              ? null
              : undefined,
        color: dto.color,
        icon: dto.icon,
        closingDay: dto.closingDay,
        dueDay: dto.dueDay,
      },
      include: { account: true },
    });
  }

  async remove(id: string, userId: string): Promise<Card> {
    await this.findOne(id, userId);
    return this.db.card.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}
