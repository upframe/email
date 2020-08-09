import moment from 'moment-timezone'
import st from 'spacetime-informal'

export const formatDateTime = (dt: any, timezone: string) => {
  const date = moment(dt).tz(timezone)
  return `${date.format('dddd')}, ${date.format('MMMM D')} at ${date.format(
    'h:mm a'
  )}`.replace(/(\w)m$/, '$1.m.')
}

export const formatTime = (dt: any, timezone: string) => {
  const date = moment(dt).tz(timezone)
  return date.format('h:mm a').replace(/(\w)m$/, '$1.m.')
}

export const tzInfo = (timezone: string): TzInfo => {
  const inf = st.display(timezone)

  const zone = moment.tz(timezone)

  let informal: TzInfo
  if (inf.standard) {
    const standard = {
      name: inf.standard.name,
      abbr: inf.standard.abbrev,
    }
    const dst = !inf.daylight
      ? null
      : {
          name: inf.daylight.name,
          abbr: inf.daylight.abbrev,
        }

    informal = zone.isDST() ? dst : standard
  } else {
    informal = {
      abbr: 'UTC ' + `+${zone.utcOffset() / 60}`.replace(/^\+-/, '-'),
      name: timezone,
    }
  }

  return informal
}

type TzInfo = {
  abbr: string
  name: string
}
