import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(dir, 'Afrivate-Mandatory-Learning-Assignment-Memo.html')
const logoPath = path.join(dir, 'afrivate-logo-long-purple-web.png')
const outputPath = path.join(dir, 'Afrivate-Mandatory-Learning-Assignment-Memo-Portal.html')

const [source, logo] = await Promise.all([
  readFile(sourcePath, 'utf8'),
  readFile(logoPath),
])

const dataUri = `data:image/png;base64,${logo.toString('base64')}`
const output = source.replace('src="afrivate-logo-long-purple.png"', `src="${dataUri}"`)

await writeFile(outputPath, output, 'utf8')
console.log('Wrote', outputPath)
