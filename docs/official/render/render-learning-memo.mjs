import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const learningDir = path.resolve(__dirname, '..', 'learning')
const brandDir = path.resolve(__dirname, '..', 'brand')
const sourcePath = path.join(learningDir, 'Afrivate-Mandatory-Learning-Assignment-Memo.html')
const logoPath = path.join(brandDir, 'afrivate-logo-long-purple-web.png')
const outputPath = path.join(learningDir, 'Afrivate-Mandatory-Learning-Assignment-Memo-Portal.html')

const [source, logo] = await Promise.all([
  readFile(sourcePath, 'utf8'),
  readFile(logoPath),
])

const dataUri = `data:image/png;base64,${logo.toString('base64')}`
const output = source.replace('src="../brand/afrivate-logo-long-purple.png"', `src="${dataUri}"`)

await writeFile(outputPath, output, 'utf8')
console.log('Wrote', outputPath)
