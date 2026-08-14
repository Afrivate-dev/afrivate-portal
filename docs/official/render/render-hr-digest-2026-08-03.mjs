import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const digestsDir = path.resolve(__dirname, '..', 'digests')
const brandDir = path.resolve(__dirname, '..', 'brand')
const sourcePath = path.join(digestsDir, 'Afrivate-HR-Digest-2026-08-03.html')
const logoPath = path.join(brandDir, 'afrivate-logo-long-purple-web.png')
const outputPath = path.join(digestsDir, 'Afrivate-HR-Digest-2026-08-03-Portal.html')

const [source, logo] = await Promise.all([
  readFile(sourcePath, 'utf8'),
  readFile(logoPath),
])

const dataUri = `data:image/png;base64,${logo.toString('base64')}`
const output = source.replace(
  'src="../brand/afrivate-logo-long-purple-web.png"',
  `src="${dataUri}"`,
)

await writeFile(outputPath, output, 'utf8')
console.log('Wrote', outputPath)
