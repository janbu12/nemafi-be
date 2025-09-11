import { Request, Response, NextFunction } from 'express';
import { success } from '../utils/responseHandler.js';
import coveredAreaService from '../services/coveredAreaService.js';

// --- Handler untuk Pengguna Publik ---

async function check(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await coveredAreaService.checkAvailability(req.body); 
    return success(res, result, result.message);
  } catch (e) {
    next(e);
  }
}

// --- Handler untuk Admin ---

async function addArea(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await coveredAreaService.addCoveredArea(req.body); 
    return success(res, result, 'Covered area added successfully', 201);
  } catch (e) {
    next(e);
  }
}

async function getAllAreas(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await coveredAreaService.getAllCoveredAreas(); 
    return success(res, result, 'List of all covered areas');
  } catch (e) {
    next(e);
  }
}

async function deleteArea(req: Request, res: Response, next: NextFunction) {
    try {
      const areaId = Number(req.params.id);
      await coveredAreaService.deleteCoveredArea(areaId); 
      return success(res, null, 'Covered area deleted successfully', 204);
    } catch (e) {
      next(e);
    }
}

async function getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await coveredAreaService.getCheckHistory(); 
      return success(res, result, 'Coverage check history');
    } catch (e) {
      next(e);
    }
}

export default { check, addArea, getAllAreas, deleteArea, getHistory };