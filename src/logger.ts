import { createLogger, format, transports } from 'winston'

export default createLogger({
  level: 'debug',
  transports: [
    new transports.Console({
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
})
