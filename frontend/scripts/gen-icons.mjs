import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const pub = resolve(__dir, '../public')

function convert(srcFile, destFile, size) {
  const svg = readFileSync(resolve(pub, srcFile), 'utf-8')
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  const png = resvg.render().asPng()
  writeFileSync(resolve(pub, destFile), png)
  console.log(`Generated ${destFile} (${size}x${size})`)
}

convert('icon.svg', 'icon-512.png', 512)
convert('icon.svg', 'icon-192.png', 192)
convert('apple-touch-icon.svg', 'apple-touch-icon.png', 180)
