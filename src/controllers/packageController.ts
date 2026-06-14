import { Request, Response, NextFunction } from 'express';
import packageService from '../services/packageService.js';
import mikrotikService from '../services/mikrotikService.js';
import { success } from '../utils/responseHandler.js';

async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await packageService.createPackage(req.body);
    return success(res, result, 'Package created', 201);
  } catch (e) {
    next(e);
  }
}

async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await packageService.getAllPackages();
    return success(res, result, 'All packages');
  } catch (e) {
    next(e);
  }
}

async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await packageService.getPackageById(id);
    if (!result) return success(res, null, 'Package not found', 404);
    return success(res, result, 'Package detail');
  } catch (e) {
    next(e);
  }
}

async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await packageService.updatePackage(id, req.body);
    return success(res, result, 'Package updated');
  } catch (e) {
    next(e);
  }
}

async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await packageService.deletePackage(id);
    return success(res, null, 'Package deleted', 204);
  } catch (e) {
    next(e);
  }
}

async function syncAll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await mikrotikService.syncAllPackagesToAllRouters();
    return success(res, result, 'Sinkronisasi paket ke semua router selesai');
  } catch (e) {
    next(e);
  }
}

export default { create, getAll, getById, update, remove, syncAll };
