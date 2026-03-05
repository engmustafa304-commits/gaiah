const chat = document.getElementById("chatScreen");

function addMessage(content, isUser=false){
let div = document.createElement("div");
div.classList.add("message");
if(isUser) div.classList.add("user");
div.innerHTML = content;
chat.appendChild(div);
chat.scrollTop = chat.scrollHeight;
}

function startChat(){

setTimeout(()=>{
addMessage("📩 وصلتك دعوة جديدة");
},800);

setTimeout(()=>{
addMessage('<img src="/static/images/invite-card.jpg">');
},2000);

setTimeout(()=>{
addMessage(`
<div class="buttons">
<button onclick="confirm()">تأكيد</button>
<button onclick="decline()">اعتذار</button>
<button onclick="location()">موقع</button>
</div>
`);
},3500);

}

function confirm(){
addMessage("✔ تم تأكيد حضورك", true);
setTimeout(()=>{
addMessage("📍 قصر البيخت للاحتفالات");
},800);
setTimeout(()=>{
addMessage('<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=VIP-GIYAH">');
},1600);
}

function decline(){
addMessage("✖ تم تسجيل اعتذارك", true);
}

function location(){
addMessage("📍 قصر البيخت للاحتفالات", true);
}

startChat();