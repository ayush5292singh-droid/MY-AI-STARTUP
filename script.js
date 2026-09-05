/* =========================================
   VYRO BUSINESS OS
   Local-first business management MVP
========================================= */

const KEY = "vyro_business_os_v1";

let db = JSON.parse(localStorage.getItem(KEY)) || {
  settings:{
    businessName:"My Business",
    currency:"₹"
  },
  products:[],
  sales:[],
  expenses:[],
  customers:[],
  employees:[]
};

function saveDB(){
  localStorage.setItem(KEY,JSON.stringify(db));
}

function money(n){
  return db.settings.currency + Number(n || 0).toLocaleString("en-IN",{
    maximumFractionDigits:2
  });
}

function id(){
  return Date.now().toString(36)+Math.random().toString(36).slice(2,7);
}

function toast(message){
  const el=document.getElementById("toast");
  el.textContent=message;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2200);
}

function openModal(id){
  document.getElementById(id).classList.add("show");
  if(id==="saleModal") populateSaleProducts();
}

function closeModal(id){
  document.getElementById(id).classList.remove("show");
}


/* NAVIGATION */

document.querySelectorAll(".nav").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const page=btn.dataset.page;

    document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
    document.getElementById(page).classList.add("active");

    document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");

    renderAll();
    window.scrollTo({top:0,behavior:"smooth"});
  });
});


/* DASHBOARD */

function totals(){
  const revenue=db.sales.reduce((a,s)=>a+Number(s.total),0);
  const expenses=db.expenses.reduce((a,e)=>a+Number(e.amount),0);

  const stockValue=db.products.reduce(
    (a,p)=>a+(Number(p.buy)||0)*(Number(p.stock)||0),0
  );

  return {
    revenue,
    expenses,
    profit:revenue-expenses,
    stockValue
  };
}

function renderDashboard(){
  const t=totals();

  document.getElementById("businessName").textContent=
    db.settings.businessName || "My Business";

  document.getElementById("todayText").textContent=
    new Date().toLocaleDateString("en-IN",{
      weekday:"long",
      day:"numeric",
      month:"long",
      year:"numeric"
    });

  document.getElementById("revenue").textContent=money(t.revenue);
  document.getElementById("expenses").textContent=money(t.expenses);
  document.getElementById("profit").textContent=money(t.profit);
  document.getElementById("stockValue").textContent=money(t.stockValue);

  const revenuePercent=Math.min(100,t.revenue/Math.max(t.revenue+t.expenses,1)*100);
  const margin=t.revenue ? Math.max(0,Math.min(100,t.profit/t.revenue*100)):0;
  const stockPercent=db.products.length
    ? Math.min(100,(db.products.filter(p=>p.stock>0).length/db.products.length)*100)
    :0;

  document.getElementById("revBar").style.width=revenuePercent+"%";
  document.getElementById("profitBar").style.width=margin+"%";
  document.getElementById("stockBar").style.width=stockPercent+"%";

  document.getElementById("revHealth").textContent=Math.round(revenuePercent)+"%";
  document.getElementById("profitHealth").textContent=Math.round(margin)+"%";
  document.getElementById("stockHealth").textContent=Math.round(stockPercent)+"%";

  generateInsight(t);
}


/* AI-LIKE BUSINESS INSIGHT */

function generateInsight(t){
  let text="";

  if(!db.sales.length && !db.expenses.length){
    text="🚀 Your business workspace is ready. Add your first sale, expense or product to start building your business intelligence.";
  }
  else if(t.profit>0){
    const margin=t.revenue ? (t.profit/t.revenue*100).toFixed(1):0;
    text=`📈 Your business is currently profitable. Revenue is ${money(t.revenue)} with ${money(t.profit)} profit and an estimated ${margin}% profit margin.`;

    const low=db.products.filter(p=>Number(p.stock)<=5);
    if(low.length){
      text+=` ⚠️ ${low.length} product${low.length>1?"s are":" is"} running low on stock.`;
    }
  }
  else{
    text=`⚠️ Your recorded expenses (${money(t.expenses)}) are currently higher than your sales (${money(t.revenue)}). Review your expenses and sales activity.`;
  }

  if(db.customers.length){
    const due=db.customers.reduce((a,c)=>a+Number(c.due||0),0);
    if(due>0) text+=` 💳 Customers currently owe ${money(due)}.`;
  }

  document.getElementById("insight").textContent=text;
}


/* PRODUCTS */

function addProduct(){
  const name=document.getElementById("pName").value.trim();
  const sku=document.getElementById("pSku").value.trim();
  const buy=Number(document.getElementById("pBuy").value);
  const sell=Number(document.getElementById("pSell").value);
  const stock=Number(document.getElementById("pStock").value);

  if(!name){
    toast("Enter a product name");
    return;
  }

  db.products.push({
    id:id(),
    name,
    sku,
    buy,
    sell,
    stock,
    created:new Date().toISOString()
  });

  saveDB();
  closeModal("productModal");
  clearProductForm();
  renderAll();
  toast("Product added");
}

function clearProductForm(){
  ["pName","pSku","pBuy","pSell","pStock"].forEach(x=>{
    document.getElementById(x).value="";
  });
}

function deleteProduct(productId){
  if(!confirm("Delete this product?")) return;

  db.products=db.products.filter(p=>p.id!==productId);
  saveDB();
  renderAll();
  toast("Product deleted");
}

function renderProducts(){
  const el=document.getElementById("productsList");
  const search=(document.getElementById("productSearch")?.value||"").toLowerCase();

  const arr=db.products.filter(p=>
    p.name.toLowerCase().includes(search) ||
    (p.sku||"").toLowerCase().includes(search)
  );

  if(!arr.length){
    el.innerHTML=`<div class="panel">📦 No products yet. Add your first product.</div>`;
    return;
  }

  el.innerHTML=arr.map(p=>`
    <div class="list-item">
      <div class="item-main">
        <div class="item-title">${escapeHTML(p.name)}</div>
        <div class="item-sub">
          SKU: ${escapeHTML(p.sku||"—")} · Buy ${money(p.buy)} · Sell ${money(p.sell)}
        </div>
      </div>

      <div class="item-value ${Number(p.stock)<=5?"low-stock":""}">
        ${p.stock} units
        <br>
        <button class="delete" onclick="deleteProduct('${p.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}


/* SALES */

function populateSaleProducts(){
  const select=document.getElementById("saleProduct");

  if(!db.products.length){
    select.innerHTML=`<option value="">No products — add one first</option>`;
    return;
  }

  select.innerHTML=db.products.map(p=>`
    <option value="${p.id}">
      ${escapeHTML(p.name)} — ${money(p.sell)} — ${p.stock} in stock
    </option>
  `).join("");

  updateSalePrice();
}

document.getElementById("saleProduct").addEventListener("change",updateSalePrice);

function updateSalePrice(){
  const product=db.products.find(
    p=>p.id===document.getElementById("saleProduct").value
  );

  if(product){
    document.getElementById("salePrice").value=product.sell;
  }
}

function addSale(){
  const product=db.products.find(
    p=>p.id===document.getElementById("saleProduct").value
  );

  if(!product){
    toast("Add a product first");
    return;
  }

  const qty=Number(document.getElementById("saleQty").value);
  const price=Number(document.getElementById("salePrice").value);

  if(qty<=0 || price<0){
    toast("Enter valid sale details");
    return;
  }

  if(qty>Number(product.stock)){
    toast("Not enough stock");
    return;
  }

  const total=qty*price;

  product.stock-=qty;

  db.sales.unshift({
    id:id(),
    productId:product.id,
    product:product.name,
    qty,
    price,
    total,
    customer:document.getElementById("saleCustomer").value.trim(),
    date:new Date().toISOString()
  });

  saveDB();
  closeModal("saleModal");

  document.getElementById("saleQty").value=1;
  document.getElementById("saleCustomer").value="";

  renderAll();
  toast("Sale recorded");
}

function deleteSale(saleId){
  if(!confirm("Delete this sale?")) return;

  const sale=db.sales.find(s=>s.id===saleId);

  if(sale){
    const product=db.products.find(p=>p.id===sale.productId);
    if(product) product.stock+=Number(sale.qty);
  }

  db.sales=db.sales.filter(s=>s.id!==saleId);
  saveDB();
  renderAll();
  toast("Sale deleted");
}

function renderSales(){
  const el=document.getElementById("salesList");
  const search=(document.getElementById("saleSearch")?.value||"").toLowerCase();

  const arr=db.sales.filter(s=>
    s.product.toLowerCase().includes(search) ||
    (s.customer||"").toLowerCase().includes(search)
  );

  if(!arr.length){
    el.innerHTML=`<div class="panel">💰 No sales recorded yet.</div>`;
    return;
  }

  el.innerHTML=arr.map(s=>`
    <div class="list-item">
      <div class="item-main">
        <div class="item-title">${escapeHTML(s.product)}</div>
        <div class="item-sub">
          ${s.qty} × ${money(s.price)}
          ${s.customer?` · ${escapeHTML(s.customer)}`:""}
          · ${formatDate(s.date)}
        </div>
      </div>

      <div class="item-value">
        ${money(s.total)}
        <br>
        <button class="delete" onclick="deleteSale('${s.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}


/* EXPENSES */

function addExpense(){
  const name=document.getElementById("eName").value.trim();
  const category=document.getElementById("eCategory").value;
  const amount=Number(document.getElementById("eAmount").value);

  if(!name || amount<=0){
    toast("Enter valid expense");
    return;
  }

  db.expenses.unshift({
    id:id(),
    name,
    category,
    amount,
    date:new Date().toISOString()
  });

  saveDB();
  closeModal("expenseModal");

  document.getElementById("eName").value="";
  document.getElementById("eAmount").value="";

  renderAll();
  toast("Expense recorded");
}

function deleteExpense(expenseId){
  db.expenses=db.expenses.filter(e=>e.id!==expenseId);
  saveDB();
  renderAll();
  toast("Expense deleted");
}

function renderExpenses(){
  const el=document.getElementById("expensesList");

  if(!db.expenses.length){
    el.innerHTML=`<div class="panel">💸 No expenses recorded.</div>`;
    return;
  }

  el.innerHTML=db.expenses.map(e=>`
    <div class="list-item">
      <div class="item-main">
        <div class="item-title">${escapeHTML(e.name)}</div>
        <div class="item-sub">${escapeHTML(e.category)} · ${formatDate(e.date)}</div>
      </div>
      <div class="item-value">
        ${money(e.amount)}
        <br>
        <button class="delete" onclick="deleteExpense('${e.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}


/* CUSTOMERS */

function addCustomer(){
  const name=document.getElementById("cName").value.trim();
  const phone=document.getElementById("cPhone").value.trim();
  const due=Number(document.getElementById("cDue").value)||0;

  if(!name){
    toast("Enter customer name");
    return;
  }

  db.customers.push({
    id:id(),
    name,
    phone,
    due
  });

  saveDB();
  closeModal("customerModal");

  ["cName","cPhone","cDue"].forEach(x=>document.getElementById(x).value="");

  renderAll();
  toast("Customer added");
}

function deleteCustomer(customerId){
  db.customers=db.customers.filter(c=>c.id!==customerId);
  saveDB();
  renderAll();
  toast("Customer deleted");
}

function renderCustomers(){
  const el=document.getElementById("customersList");

  if(!db.customers.length){
    el.innerHTML=`<div class="panel">👤 No customers yet.</div>`;
    return;
  }

  el.innerHTML=db.customers.map(c=>`
    <div class="list-item">
      <div class="item-main">
        <div class="item-title">${escapeHTML(c.name)}</div>
        <div class="item-sub">${escapeHTML(c.phone||"No phone")}</div>
      </div>

      <div class="item-value">
        ${c.due>0?`Due ${money(c.due)}`:"Paid"}
        <br>
        <button class="delete" onclick="deleteCustomer('${c.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}


/* EMPLOYEES */

function addEmployee(){
  const name=document.getElementById("empName").value.trim();
  const role=document.getElementById("empRole").value.trim();
  const salary=Number(document.getElementById("empSalary").value)||0;

  if(!name){
    toast("Enter employee name");
    return;
  }

  db.employees.push({
    id:id(),
    name,
    role,
    salary
  });

  saveDB();
  closeModal("employeeModal");

  ["empName","empRole","empSalary"].forEach(x=>{
    document.getElementById(x).value="";
  });

  renderAll();
  toast("Employee added");
}

function deleteEmployee(employeeId){
  db.employees=db.employees.filter(e=>e.id!==employeeId);
  saveDB();
  renderAll();
  toast("Employee deleted");
}

function renderEmployees(){
  const el=document.getElementById("employeesList");

  if(!db.employees.length){
    el.innerHTML=`<div class="panel">👨‍💼 No employees yet.</div>`;
    return;
  }

  el.innerHTML=db.employees.map(e=>`
    <div class="list-item">
      <div class="item-main">
        <div class="item-title">${escapeHTML(e.name)}</div>
        <div class="item-sub">${escapeHTML(e.role||"Employee")}</div>
      </div>

      <div class="item-value">
        ${money(e.salary)}/month
        <br>
        <button class="delete" onclick="deleteEmployee('${e.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}


/* REPORTS */

function renderReports(){
  const t=totals();

  document.getElementById("rSales").textContent=money(t.revenue);
  document.getElementById("rExpenses").textContent=money(t.expenses);
  document.getElementById("rProfit").textContent=money(t.profit);
  document.getElementById("rOrders").textContent=db.sales.length;

  renderChart();
  renderTopProducts();
}

function renderChart(){
  const chart=document.getElementById("chart");

  const days=[];

  for(let i=6;i>=0;i--){
    const d=new Date();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate()-i);

    const key=d.toDateString();

    const sales=db.sales
      .filter(s=>new Date(s.date).toDateString()===key)
      .reduce((a,s)=>a+Number(s.total),0);

    const expenses=db.expenses
      .filter(e=>new Date(e.date).toDateString()===key)
      .reduce((a,e)=>a+Number(e.amount),0);

    days.push({
      label:d.toLocaleDateString("en-IN",{weekday:"short"}),
      value:sales+expenses
    });
  }

  const max=Math.max(...days.map(d=>d.value),1);

  chart.innerHTML=days.map(d=>`
    <div class="bar" style="height:${Math.max(4,d.value/max*100)}%">
      <span>${d.label}</span>
    </div>
  `).join("");
}

function renderTopProducts(){
  const el=document.getElementById("topProducts");

  const map={};

  db.sales.forEach(s=>{
    map[s.product]=(map[s.product]||0)+Number(s.qty);
  });

  const arr=Object.entries(map)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5);

  if(!arr.length){
    el.innerHTML=`<p class="muted">Sales data will appear here.</p>`;
    return;
  }

  el.innerHTML=arr.map((x,i)=>`
    <div class="list-item">
      <div class="item-title">#${i+1} ${escapeHTML(x[0])}</div>
      <div class="item-value">${x[1]} sold</div>
    </div>
  `).join("");
}


/* SETTINGS */

function loadSettings(){
  document.getElementById("settingsBusiness").value=
    db.settings.businessName;

  document.getElementById("currency").value=
    db.settings.currency;
}

function saveSettings(){
  db.settings.businessName=
    document.getElementById("settingsBusiness").value.trim() ||
    "My Business";

  db.settings.currency=
    document.getElementById("currency").value;

  saveDB();
  renderAll();
  toast("Settings saved");
}


/* BACKUP */

function exportData(){
  const blob=new Blob(
    [JSON.stringify(db,null,2)],
    {type:"application/json"}
  );

  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");

  a.href=url;
  a.download="vyro-business-backup.json";
  a.click();

  URL.revokeObjectURL(url);
  toast("Backup created");
}

function restoreData(event){
  const file=event.target.files[0];
  if(!file) return;

  const reader=new FileReader();

  reader.onload=()=>{
    try{
      const imported=JSON.parse(reader.result);

      if(!imported.products ||
         !imported.sales ||
         !imported.expenses){
        throw new Error();
      }

      db=imported;
      saveDB();
      renderAll();
      loadSettings();
      toast("Backup restored");
    }catch{
      toast("Invalid backup file");
    }
  };

  reader.readAsText(file);
}

function resetData(){
  if(!confirm("This will delete all local business data. Continue?")) return;

  localStorage.removeItem(KEY);
  location.reload();
}


/* RECEIPT OCR */

function openScanner(){
  openModal("scannerModal");
}

async function scanReceipt(event){
  const file=event.target.files[0];

  if(!file) return;

  const result=document.getElementById("ocrResult");

  result.innerHTML=`
    <div class="panel">
      <b>Reading document...</b>
      <p class="muted">Please wait.</p>
    </div>
  `;

  try{
    const worker=await Tesseract.createWorker("eng");

    const data=await worker.recognize(file);

    await worker.terminate();

    const text=data.data.text.trim();

    if(!text){
      result.innerHTML=`
        <div class="ocr-box">
        No readable text found. Try a clearer photo.
        </div>
      `;
      return;
    }

    const amount=findAmount(text);

    result.innerHTML=`
      <div class="ocr-box">${escapeHTML(text)}</div>

      <div class="panel" style="margin-top:10px">
        <b>Detected total</b>
        <h2>${amount?money(amount):"Not detected"}</h2>

        ${
          amount
          ? `<button class="primary wide"
              onclick="createScannedExpense(${amount})">
              Add as expense
             </button>`
          : ""
        }
      </div>
    `;

    toast("Document scanned");

  }catch(error){
    console.error(error);

    result.innerHTML=`
      <div class="ocr-box">
        Scanner could not process this image.
        Try another clear photo.
      </div>
    `;
  }
}

function findAmount(text){
  const lines=text.split("\n");

  const keywords=[
    "total",
    "grand total",
    "amount payable",
    "net amount",
    "balance"
  ];

  for(const line of lines){
    const lower=line.toLowerCase();

    if(keywords.some(k=>lower.includes(k))){
      const matches=line.match(
        /(?:₹|rs\.?|inr)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/gi
      );

      if(matches && matches.length){
        const last=matches[matches.length-1]
          .replace(/[^0-9.,]/g,"")
          .replace(/,/g,"");

        const n=Number(last);

        if(n>0) return n;
      }
    }
  }

  return null;
}

function createScannedExpense(amount){
  db.expenses.unshift({
    id:id(),
    name:"Scanned receipt",
    category:"Scanned expense",
    amount,
    date:new Date().toISOString()
  });

  saveDB();
  closeModal("scannerModal");
  renderAll();

  toast("Scanned expense added");
}


/* BARCODE */

async function startBarcode(){
  if("BarcodeDetector" in window){

    try{
      const supported=
        await BarcodeDetector.getSupportedFormats();

      toast("Barcode scanner available");

      const code=prompt(
        "Camera barcode mode is supported by this browser. Enter/scan the product barcode:"
      );

      if(code){
        findBarcode(code);
      }

    }catch{
      manualBarcode();
    }

  }else{
    manualBarcode();
  }
}

function manualBarcode(){
  const code=prompt("Enter product barcode / SKU:");

  if(code) findBarcode(code);
}

function findBarcode(code){
  const product=db.products.find(
    p=>String(p.sku)===String(code)
  );

  if(product){
    toast(`${product.name} — ${product.stock} units`);
  }else{
    const create=confirm(
      "Product not found. Add this barcode as a new product?"
    );

    if(create){
      openModal("productModal");
      document.getElementById("pSku").value=code;
    }
  }
}


/* UTILITIES */

function formatDate(date){
  return new Date(date).toLocaleDateString("en-IN",{
    day:"numeric",
    month:"short",
    year:"numeric"
  });
}

function escapeHTML(value){
  return String(value??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}


/* RENDER EVERYTHING */

function renderAll(){
  renderDashboard();
  renderProducts();
  renderSales();
  renderExpenses();
  renderCustomers();
  renderEmployees();
  renderReports();
  loadSettings();
  populateSaleProducts();
}


/* INITIALIZE */

renderAll();
