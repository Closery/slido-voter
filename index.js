const config = require('./config')
const axios = require('axios')
const puppeteer = require('puppeteer')
const puppeteer_config = {
  headless: !config.watch_bot_live,
  args: [],
}

;(async () => {
  const like_wish = config.like_wish
  const event_code = config.event_code
  const qid = config.question_id
  const res = await fetchUUID(event_code)
  const uuid = res.uuid

  if (res.error) {
    console.log('🔻 Event not found.')
    return
  }

  const browser = await puppeteer.launch(puppeteer_config)
  const page = await browser.newPage()

  for (let index = 0; index < like_wish; index++) {
    await page.goto(`https://app.sli.do/event/${event_code}/live/questions`)
    await page.setViewport({ width: 1200, height: 800 })

    await page.waitForSelector('.app__content__body')

    console.log('🔸 Looking for question...')

    await page.waitForSelector('.question-list__container')

    if (config.safe_wait) {
      await page.evaluate(async () => {
        await new Promise(function (resolve) {
          setTimeout(resolve, config.safe_wait_timer)
        })
      })
    }

    autoScroll(page)

    await page.waitForSelector(`[data-qid="${qid}"] button[aria-label="Upvote question"]`)

    console.log('🔹 Question found')

    const btn = await page.$(`[data-qid="${qid}"] button[aria-label="Upvote question"]`)
    await btn.evaluate((btn) => btn.click())

    await page.waitForResponse(`https://app.sli.do/eu1/api/v0.5/events/${uuid}/questions/${qid}/like`)

    console.log(`💚 Liked! (${index + 1}/${like_wish})`)

    await page.deleteCookie({
      name: 'AWSALBCORS',
      domain: 'app.sli.do',
    })

    await page.deleteCookie({
      name: 'AWSALB',
      domain: 'app.sli.do',
    })

    await page.deleteCookie({
      name: 'Slido.EventAuthTokens',
      domain: 'app.sli.do',
    })
  }

  await browser.close()
})()

function autoScroll(page) {
  page.evaluate(() => {
    let totalHeight = 0
    const distance = 100
    const timer = setInterval(() => {
      let scrollHeight = document.body.scrollHeight
      window.scrollBy(0, distance)
      totalHeight += distance

      if (totalHeight >= scrollHeight - window.innerHeight) {
        clearInterval(timer)
      }
    }, 200)
  })
}

async function fetchUUID(event_code) {
  try {
    const res = await axios({
      method: 'GET',
      url: `https://app.sli.do/eu1/api/v0.5/app/events?hash=${event_code}`,
      headers: { 'accept-encoding': '*' },
    })

    return {
      error: false,
      uuid: res.data.uuid,
    }
  } catch (error) {
    return {
      error: true,
      uuid: '',
    }
  }
}
