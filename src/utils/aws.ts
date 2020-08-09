import AWS from 'aws-sdk'

export const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_KEY_ID,
  secretAccessKey: process.env.AWS_KEY_SECRET,
  region: 'eu-west-2',
})

export const ddb = new AWS.DynamoDB.DocumentClient({
  region: 'eu-west-1',
})
