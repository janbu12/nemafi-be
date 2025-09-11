import { Request, Response, NextFunction } from 'express';
import routerService from '../services/routerService.js';
import { success } from '../utils/responseHandler.js';
import mikrotikService from '../services/mikrotikService.js';

async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await routerService.create(req.body);
    return success(res, result, 'Router created successfully', 201);
  } catch (e) {
    next(e);
  }
}

async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await routerService.getAll();
    return success(res, result, 'List of all routers');
  } catch (e) {
    next(e);
  }
}

async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await routerService.getById(id);
    if (!result) return success(res, null, 'Router not found', 404);
    return success(res, result, 'Router detail');
  } catch (e) {
    next(e);
  }
}

async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await routerService.update(id, req.body);
    return success(res, result, 'Router updated successfully');
  } catch (e) {
    next(e);
  }
}

async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await routerService.remove(id);
    return success(res, null, 'Router deleted successfully', 204);
  } catch (e) {
    next(e);
  }
}

async function testConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const result = await mikrotikService.testConnection(id);
    return success(res, result, result.message);
  } catch (e) {
    next(e);
  }
}

export default { create, getAll, getById, update, remove,testConnection };