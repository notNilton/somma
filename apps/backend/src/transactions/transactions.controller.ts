import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { ListTransactionsQuery } from './dto/list-transactions.query';
import { ImportTransactionsDto } from './dto/import-transactions.dto';
import { Transaction, User } from '@mirante/database';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query() query: ListTransactionsQuery,
  ): Promise<Transaction[]> {
    return this.transactionsService.findAll(user.id, query);
  }

  @Get('future')
  findFuture(
    @CurrentUser() user: User,
    @Query() query: ListTransactionsQuery,
  ): Promise<any[]> {
    return this.transactionsService.listFuture(user.id, query);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Transaction> {
    return this.transactionsService.findOne(id, user.id);
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionsService.create(user.id, dto);
  }

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @CurrentUser() user: User,
    @UploadedFile() file: any,
    @Body() dto: ImportTransactionsDto,
  ): Promise<{
    created: number;
    skipped: number;
    skippedInvalid: number;
    skippedDuplicate: number;
    errors: string[];
  }> {
    return this.transactionsService.importCsv(user.id, file, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionsService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Transaction> {
    return this.transactionsService.remove(id, user.id);
  }
}
