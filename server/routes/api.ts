import { Router } from 'express'
import {
  craftCard,
  createTrade,
  duelArena,
  fuseCards,
  getArena,
  getBootstrap,
  getInventory,
  getLeaderboard,
  getTradeInbox,
  respondToTrade,
  upsertProfile,
} from '../services/game'

export const apiRouter = Router()

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true })
})

apiRouter.get('/bootstrap', async (req, res, next) => {
  try {
    res.json(await getBootstrap(req))
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/inventories/:username', async (req, res, next) => {
  try {
    res.json(await getInventory(req.params.username))
  } catch (error) {
    next(error)
  }
})

apiRouter.post('/me/profile', async (req, res, next) => {
  try {
    res.json(await upsertProfile(req))
  } catch (error) {
    next(error)
  }
})

apiRouter.post('/craft', async (req, res, next) => {
  try {
    res.json(await craftCard(req))
  } catch (error) {
    next(error)
  }
})

apiRouter.post('/fuse', async (req, res, next) => {
  try {
    res.json(await fuseCards(req))
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/trades/inbox', async (req, res, next) => {
  try {
    res.json(await getTradeInbox(req))
  } catch (error) {
    next(error)
  }
})

apiRouter.post('/trades/offers', async (req, res, next) => {
  try {
    res.json(await createTrade(req))
  } catch (error) {
    next(error)
  }
})

apiRouter.post('/trades/:id/respond', async (req, res, next) => {
  try {
    res.json(await respondToTrade(req, req.params.id))
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/leaderboard', async (_req, res, next) => {
  try {
    res.json(await getLeaderboard())
  } catch (error) {
    next(error)
  }
})

apiRouter.get('/arena', async (req, res, next) => {
  try {
    res.json(await getArena(req))
  } catch (error) {
    next(error)
  }
})

apiRouter.post('/arena/duel', async (req, res, next) => {
  try {
    res.json(await duelArena(req))
  } catch (error) {
    next(error)
  }
})
