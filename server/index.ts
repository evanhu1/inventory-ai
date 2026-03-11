import app from './app'
import { env } from './env'

app.listen(env.port, () => {
  console.log(`Inventory.ai server listening on ${env.port}`)
})
