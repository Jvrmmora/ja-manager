import Young from '../models/Young';
import { FilterQuery } from 'mongoose';

/**
 * Centraliza el filtro de soft-delete (`deletedAt: null`) que antes se
 * repetía a mano en cada query de `youngController`, para evitar que una
 * consulta nueva olvide excluir jóvenes eliminados.
 */
const NOT_DELETED: FilterQuery<any> = { deletedAt: null };

export class YoungRepository {
  static findActive(filter: FilterQuery<any> = {}): any {
    return Young.find({ ...filter, ...NOT_DELETED });
  }

  static findOneActive(filter: FilterQuery<any>): any {
    return Young.findOne({ ...filter, ...NOT_DELETED });
  }

  static findByIdActive(id: string): any {
    return Young.findOne({ _id: id, ...NOT_DELETED });
  }

  static countActive(filter: FilterQuery<any> = {}): Promise<number> {
    return Young.countDocuments({ ...filter, ...NOT_DELETED });
  }
}
