async function main () {
  const gt = new GT('localhost:3000')

  await gt.connectAuthAndJoin(undefined, '')
}

main()
