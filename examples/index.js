async function main () {
  const connectBtn = document.getElementById('connectbtn')
  const ipInput = document.getElementById('ip')
  const idInput = document.getElementById('id')
  const authBtn = document.getElementById('authbtn')
  const disconnectedDiv = document.getElementById('disconnected')
  const connectedDiv = document.getElementById('connected')
  const authDiv = document.getElementById('authed')
  const roomInput = document.getElementById('room')
  const joinBtn = document.getElementById('joinbtn')
  const joinedDiv = document.getElementById('joined')
  const leaveRoomBtn = document.getElementById('leaveroombtn')
  const info = document.getElementById('info')
  const users = document.getElementById('users')
  const state = document.getElementById('state')
  const updateuserInput = document.getElementById('updateuser')
  const updateuserBtn = document.getElementById('updateuserbtn')
  const updateuserBtnUnr = document.getElementById('updateuserbtnunr')
  const updatestateInput = document.getElementById('updatestate')
  const updatestateBtn = document.getElementById('updatestatebtn')
  const updatestateBtnUnr = document.getElementById('updatestatebtnunr')

  console.log(connectBtn,
    ipInput,
    idInput,
    authBtn,
    disconnectedDiv,
    connectedDiv,
    authDiv,
    roomInput,
    joinBtn,
    joinedDiv,
    leaveRoomBtn,
    info,
    users,
    state,
    updateuserInput,
    updateuserBtn,
    updateuserBtnUnr,
    updatestateInput,
    updatestateBtn,
    updatestateBtnUnr)
}

main()
