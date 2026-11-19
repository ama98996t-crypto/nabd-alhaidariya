(function(){
const SUPABASE_URL='https://dwffkopuisuyqpgedowp.supabase.co';
const SUPABASE_KEY='sb_publishable_2wT5I3b3mY1IPzbFN5NllQ_Ja136LJn';
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const isAdminPage=location.pathname.endsWith('/admin.html');
let user=null, role='worker', remoteRows=[];
const style=document.createElement('style');
style.textContent='#cloudGate{position:fixed;inset:0;background:#10263d;z-index:9999;display:grid;place-items:center;padding:18px;font-family:Tahoma,Arial}#cloudGate .gate{background:#fff;width:min(430px,100%);border-radius:18px;padding:25px;box-shadow:0 20px 60px #0004}#cloudGate h2{margin:0 0 8px;color:#10263d}#cloudGate p{color:#667788;font-size:13px;line-height:1.7}#cloudGate input{width:100%;padding:12px;margin:6px 0 12px;border:1px solid #dbe3ea;border-radius:8px}#cloudGate button{border:0;border-radius:8px;padding:12px 16px;background:#16a6a1;color:white;font-weight:bold;margin:4px 0;width:100%}#cloudGate button.alt{background:#edf4f5;color:#183b56}#cloudGate #gateMsg{color:#b43d36;min-height:22px}';
document.head.appendChild(style);
const gate=document.createElement('div');gate.id='cloudGate';gate.innerHTML='<div class="gate"><div style="font-size:30px">☁️</div><h2>نبض الحيدرية</h2><p>تسجيل الدخول إلى النظام السحابي. أنشئ حساباً جديداً للموظفين أو سجّل الدخول بحسابك.</p><label>الاسم (للحساب الجديد)</label><input id="gateName" placeholder="الاسم الكامل"><label>البريد الإلكتروني</label><input id="gateEmail" type="email" autocomplete="username" placeholder="name@example.com"><label>كلمة المرور</label><input id="gatePass" type="password" autocomplete="current-password" placeholder="8 أحرف على الأقل"><button id="gateLogin">تسجيل الدخول</button><button class="alt" id="gateSignup">إنشاء حساب موظف جديد</button><div id="gateMsg"></div><p style="font-size:11px">الحسابات الجديدة تبدأ بصلاحية موظف. تمنح الإدارة صلاحية المدير أو المشرف بعد التحقق.</p></div>';
document.body.appendChild(gate);
const msg=t=>document.getElementById('gateMsg').textContent=t;
async function enter(){
 const {data:pd,error:pe}=await client.from('nabd_profiles').select('role,active,display_name').eq('user_id',user.id).maybeSingle();
 if(pe||!pd||!pd.active){msg('تعذر قراءة صلاحية الحساب. راجع مسؤول النظام.');await client.auth.signOut();return}
 role=pd.role;
 if(isAdminPage&&!['admin','supervisor'].includes(role)){msg('هذا الحساب ليس لديه صلاحية دخول النظام الإداري.');await client.auth.signOut();return}
 const {data:rows,error}=await client.from('nabd_records').select('*').order('created_at',{ascending:false});
 if(error){msg('تعذر تحميل البيانات: '+error.message);return}
 remoteRows=rows||[];
 data={maintenance:[],cleaning:[],assets:[],inventory:[]};
 remoteRows.forEach(r=>{if(data[r.category])data[r.category].push({...r.payload,id:r.id,_created_by:r.created_by,_assigned_to:r.assigned_to})});
 gate.remove();
 document.querySelector('.shell').style.display='';
 if(role!=='admin'){
  document.querySelectorAll('.nav button[data-page="assets"],.nav button[data-page="inventory"],.nav button[data-page="reports"]').forEach(x=>x.remove());
  const foot=document.querySelector('.side-foot');if(foot)foot.textContent='حساب موظف | البيانات محفوظة سحابياً';
  const oldTable=table;table=function(key,rows){const visible=role==='worker'?rows.filter(r=>r._created_by===user.id||r._assigned_to===user.id):rows;return oldTable(key,visible).replace(/<button class="btn danger small"[^>]*>حذف<\/button>/g,'')}
 }
 render();
 const top=document.querySelector('.top');if(top){const s=document.createElement('small');s.textContent=(pd.display_name||user.email)+' · '+(role==='admin'?'مدير':role==='supervisor'?'مشرف':'موظف');top.appendChild(s)}
}
async function authInit(){
 document.querySelector('.shell').style.display='none';
 document.getElementById('gateLogin').onclick=async()=>{msg('جارٍ تسجيل الدخول...');const {data,error}=await client.auth.signInWithPassword({email:document.getElementById('gateEmail').value.trim(),password:document.getElementById('gatePass').value});if(error){msg(error.message);return}user=data.user;await enter()};
 document.getElementById('gateSignup').onclick=async()=>{msg('جارٍ إنشاء الحساب...');const {data,error}=await client.auth.signUp({email:document.getElementById('gateEmail').value.trim(),password:document.getElementById('gatePass').value,options:{data:{display_name:document.getElementById('gateName').value.trim()}}});if(error){msg(error.message);return}if(data.session){user=data.user;await enter()}else msg('تم إرسال رسالة تأكيد إلى بريدك. أكّد البريد ثم سجّل الدخول.')};
 const {data}=await client.auth.getSession();if(data.session){user=data.session.user;await enter()}
}
window.nabdCloud={client,refresh:async()=>{const {data,error}=await client.from('nabd_records').select('*').order('created_at',{ascending:false});if(error)throw error;remoteRows=data||[];return remoteRows}};
save=async function(){
 try{
  const categories=role==='worker'?['maintenance','cleaning']:Object.keys(data);
  for(const category of categories){
   const current=data[category]||[];
   const oldRows=remoteRows.filter(r=>r.category===category);
   const oldById=new Map(oldRows.map(r=>[r.id,r]));
   const rows=current.filter(r=>{
    const old=oldById.get(r.id);
    const payload={...r};delete payload.id;delete payload._created_by;delete payload._assigned_to;
    return !old || JSON.stringify(old.payload)!==JSON.stringify(payload) || old.status!==(r.status||r.condition||null) || old.assigned_to!==(r._assigned_to||null);
   }).map(r=>{const payload={...r};delete payload.id;delete payload._created_by;delete payload._assigned_to;return {id:r.id,category,payload,status:r.status||r.condition||null,assigned_to:r._assigned_to||null,created_by:r._created_by||user.id,updated_at:new Date().toISOString()}});
   if(rows.length){const {error}=await client.from('nabd_records').upsert(rows,{onConflict:'id'});if(error)throw error}
   if(role==='admin'){
    const now=current.map(r=>r.id),gone=oldRows.map(r=>r.id).filter(id=>!now.includes(id));
    if(gone.length){const {error}=await client.from('nabd_records').delete().in('id',gone);if(error)throw error}
   }
  }
  const {data:rows,error}=await client.from('nabd_records').select('*').order('created_at',{ascending:false});if(error)throw error;
  remoteRows=rows||[];
  render();
 }catch(e){alert('لم يتم حفظ التغييرات سحابياً: '+e.message);render()}
};
const originalSubmit=document.getElementById('recordForm').onsubmit;
document.getElementById('recordForm').onsubmit=async e=>{
 e.preventDefault();let key=editing.key,fd=new FormData(e.target),obj=Object.fromEntries(fd.entries());
 const photo=document.getElementById('recordPhoto')?.files?.[0];
 if(photo){if(!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size>5242880){alert('الصورة يجب أن تكون JPG أو PNG أو WEBP وبحجم لا يتجاوز 5 ميغابايت');return}const path=user.id+'/'+crypto.randomUUID()+'-'+photo.name.replace(/[^a-zA-Z0-9._-]/g,'_');const {error:upErr}=await client.storage.from('nabd-attachments').upload(path,photo,{contentType:photo.type,upsert:false});if(upErr){alert('تعذر رفع الصورة: '+upErr.message);return}obj.photo_path=path}
 if(editing.id){let idx=data[key].findIndex(x=>x.id===editing.id);data[key][idx]={...data[key][idx],...obj,updatedAt:new Date().toISOString()}}
 else data[key].push({id:crypto.randomUUID(),...obj,createdAt:new Date().toISOString(),_created_by:user.id});
 closeModal();await save();
};
removeRecord=async function(key,id){if(role!=='admin'){alert('حذف السجلات متاح للمدير فقط.');return}if(!confirm('متأكد من حذف هذا السجل؟'))return;data[key]=data[key].filter(x=>x.id!==id);await save()};
document.querySelector('.top').insertAdjacentHTML('beforeend','<button id="cloudLogout" class="btn secondary small">خروج</button>');
document.getElementById('cloudLogout').onclick=async()=>{await client.auth.signOut();location.reload()};
authInit();
})();