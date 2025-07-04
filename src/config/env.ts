import * as dotenv from 'dotenv'
const env: dotenv.DotenvPopulateInput = {}
dotenv.config({ path: ['.env.local', '.env'], processEnv: env })

export default env