const { appendFileSync, unlink } = require("fs");
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto(
    "http://app1.sefaz.mt.gov.br/0325677500623408/7C7B6A9347C50F55032569140065EBBF/4C7283A0B4318486042584C4004436C1",
    {
      waitUntil: "networkidle2",
    }
  );

  const linhas = await page.$$eval("table tr", (linhas) => {
    return Array.from(
      linhas.map((linha) => {
        return Array.from(linha.children).map((coluna) => {
          return Array.from(coluna.children).map((linha_coluna) => {
            return linha_coluna.textContent;
          });
        });
      })
    );
  });

  const LinhasFiltradasApenasCom5tens = linhas.filter(
    (linha) => linha.length == 5
  );

  const ListaValores = [];
  const ListaValoresMaisDeUmNCM = [];
  const NovaLista = [];
  const NCMsConvertidos = [];

  LinhasFiltradasApenasCom5tens.forEach((linha) => {
    let novaLinha = [];
    linha.forEach((coluna, index) => {
      novaLinha.push(
        index == 4
          ? Number(coluna.join("&").replace(",", ".").replace("%", ""))
          : coluna.join("&")
      );
    });
    ListaValores.push(novaLinha);
  });

  ListaValores.forEach((linha) => {
    if (
      linha[2].includes("&&") ||
      linha[2].includes(" ") ||
      linha[2].includes("  ") ||
      linha[2].includes("   ")
    ) {
      ListaValoresMaisDeUmNCM.push(linha);
    } else {
      NovaLista.push(linha);
    }
  });

  ListaValoresMaisDeUmNCM.forEach((linha) => {
    const NCMs = linha[2].split("&&");
    const NCMs1 = linha[2].split(" ");
    const NCMs2 = linha[2].split("  ");
    const NCMs3 = linha[2].split("   ");
    NCMs.forEach((ncm) => {
      NCMsConvertidos.push([linha[0], linha[1], ncm, linha[3], linha[4]]);
    });
    NCMs1.forEach((ncm) => {
      NCMsConvertidos.push([linha[0], linha[1], ncm, linha[3], linha[4]]);
    });
    NCMs2.forEach((ncm) => {
      NCMsConvertidos.push([linha[0], linha[1], ncm, linha[3], linha[4]]);
    });
    NCMs3.forEach((ncm) => {
      NCMsConvertidos.push([linha[0], linha[1], ncm, linha[3], linha[4]]);
    });
  });

  const ListaFinal = NovaLista.concat(NCMsConvertidos)
    .filter((linha) => linha[0] != "Item" || linha[2].length == 0)
    .sort((a, b) => (a[1] < b[1] ? 1 : b[1] > a[1] ? -1 : 0));

  // writeFileSync("lista.json", JSON.stringify(ListaFinal));

  GenerateInsert(ListaFinal);
  console.log("Arquivo Gerado!");
  page.close();
  browser.close();
})();

function aspas(value) {
  return `'` + value + `'`;
}

function GenerateInsert(LISTA) {
  const NomeTabela = "LISTA_MVA";
  unlink(NomeTabela + ".sql", (e) => null);
  function AppendFile(data) {
    appendFileSync(`${NomeTabela}.sql`, data);
  }

  AppendFile(`
  IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='${NomeTabela}' and xtype='U')
  CREATE Table ${NomeTabela} (
  ID INT NOT NULL IDENTITY(1,1) PRIMARY KEY,	
  Item varchar(20), 
  CEST varchar(20), 
  NCM varchar(20), 
  Descricao varchar(300), 
  MVA numeric(25,10)
  )
 GO

 DELETE ${NomeTabela}

 GO

 
 `);

  LISTA.forEach((obj) => {
    let ValorComum = {
      Item: aspas(obj[0]),
      CEST: aspas(obj[1]),
      NCM: aspas(obj[2]),
      Descricao: aspas(obj[3].replace(`'`, "")),
      MVA: obj[4] || 0,
    };

    let lineInsert = `INSERT INTO ${NomeTabela} (`;
    /////CAMPOS DO INSERT
    Object.keys(ValorComum).forEach((key) => {
      lineInsert += key + ", ";
    });
    lineInsert = lineInsert.substring(0, lineInsert.length - 2);
    lineInsert += ") VALUES (";
    /////VALORES DO INSERT
    Object.keys(ValorComum).forEach((key) => {
      lineInsert += ValorComum[key] + ", ";
    });
    lineInsert = lineInsert.substring(0, lineInsert.length - 2);
    lineInsert += `);\n `;
    /////ANEXA A LINHA NO ARQUIVO
    AppendFile(lineInsert);
  });
  AppendFile("GO \n");
}

module.exports = GenerateInsert;
