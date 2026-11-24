import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
const source=process.argv[2] || process.env.REF_H5 || path.resolve('../../参考/逆向还原/源码/h5')
const target=path.resolve('src/static')
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)])}
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const reference=new Set(files(source).filter(f=>/\.(png|jpe?g|gif|webp|svg|ttf|woff2?|mp3|ogg|wav|atlas|skel)$/i.test(f)).map(hash))
const resources=files(target).filter(f=>!f.endsWith('.md'))
const matches=resources.filter(f=>reference.has(hash(f)))
const report={checkedAt:new Date().toISOString(),referenceAssets:reference.size,projectAssets:resources.length,identicalAssets:matches}
fs.mkdirSync('docs/verification',{recursive:true})
fs.writeFileSync('docs/verification/assets.json',JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
if(matches.length)process.exitCode=1
