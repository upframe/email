export const email = (event) => {
  console.log(event.Records[0].Sns.Message)
}
