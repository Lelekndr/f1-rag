import puppeteer from "puppeteer"

const run = async () => {
  const url = process.argv[2]
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 })
  await new Promise((r) => setTimeout(r, 3000))

  const main = await page.evaluate(
    () => ((document.querySelector("main") ?? document.body) as HTMLElement).innerText
  )
  const body = await page.evaluate(() => document.body.innerText)

  console.log("main:", main.length, "caracteres | body:", body.length, "caracteres")
  console.log("---- início do main ----")
  console.log(main.slice(0, 1500))
  await browser.close()
}

run()