from pathlib import Path

p = Path('.github/workflows/ui-smoke-rc4.yml')
s = p.read_text()

old_focus = """            const focusSearch = () => evalJs(`(() => {
              const i=[...document.querySelectorAll('input')].find(x => (x.placeholder||'').trim()==='Search enabled registries and catalogs.')
              if (!i) return false
              i.focus(); i.select(); return document.activeElement===i
            })()`)
"""
new_focus = """            const focusSearch = () => evalJs(`(() => {
              const i=[...document.querySelectorAll('input')].find(x => {
                const placeholder=(x.placeholder||'').trim()
                return placeholder==='Search plugins' || placeholder==='Search enabled registries and catalogs.'
              })
              if (!i) return false
              i.focus(); i.select(); return document.activeElement===i
            })()`)
"""
if old_focus not in s:
    raise SystemExit('focusSearch anchor changed')
s = s.replace(old_focus, new_focus, 1)

old_inventory = """            if (!body.includes('Registry Aggregator') || !body.includes('Automation Tasks Attention')) {
              throw new Error('Installed plugin inventory did not load: ' + body.slice(0, 1200))
            }

            if (!await click('Browse')) throw new Error('Browse tab not found')
"""
new_inventory = """            if (!body.includes('Registry Aggregator') || !body.includes('Automation Tasks Attention')) {
              throw new Error('Installed plugin inventory did not load: ' + body.slice(0, 1200))
            }
            if (/Get started/i.test(body)) {
              if (!await click('Close')) throw new Error('Get started dialog is visible but its Close control was not found')
              await sleep(500)
              body = await bodyText()
              if (/Get started/i.test(body)) throw new Error('Get started dialog did not close')
            }

            if (!await click('Browse')) throw new Error('Browse tab not found')
"""
if old_inventory not in s:
    raise SystemExit('inventory anchor changed')
s = s.replace(old_inventory, new_inventory, 1)

old_final = """            fs.writeFileSync('/tmp/ui-05-final.txt', await bodyText())
            await shot('ui-05-final.png')
            ws.close()
"""
new_final = """            fs.writeFileSync('/tmp/ui-05-final.txt', await bodyText())
            await shot('ui-05-final.png')

            if (!await click('Automation tasks')) throw new Error('Automation tasks sidebar control not found')
            body = await waitFor(v => v.includes('Automation tasks') && v.includes('Task catalog'))
            fs.writeFileSync('/tmp/ui-06-schedule.txt', body)
            await shot('ui-06-schedule.png')
            if (!body.includes('Automation tasks') || !body.includes('Task catalog')) {
              throw new Error('Automation Tasks panel did not mount the native task catalog: ' + body.slice(0, 1200))
            }
            ws.close()
"""
if old_final not in s:
    raise SystemExit('final anchor changed')
s = s.replace(old_final, new_final, 1)

p.write_text(s)
