import * as dotenv from 'dotenv'
const env: dotenv.DotenvPopulateInput = {}
dotenv.config({ path: ['.env.local', '.env'], processEnv: env })

console.info('APP_PORT is: ', env.APP_PORT)
export default env