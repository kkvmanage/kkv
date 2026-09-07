const path = require('path');
const { google } = require(path.resolve(__dirname, '../backend/node_modules/googleapis'));

const sa1 = {
  name: 'client-2-507109 (kkv-gold-finance-drive)',
  email: 'kkv-gold-finance-drive@client-2-507109.iam.gserviceaccount.com',
  key: `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC1HquntuQhBPBM\nvNwEHKe8gtgty3La2/r1LgDRs8wHxXZsENg1ffk7+G1iv4dUtrkEbmPW803J3fz7\nwmlAXJMa/vb0ZiNELKQxWQMuiZt4NFIOu9c6a2vgBwg3tY9HD+LRZ0yGfYK84Fla\n+rff3+GR3ckwcHBXdbEaFk1PvifOCZs1n40NgzDnVDaLG3/hbyHQTpIr2optd93n\nGiP2xaBGz7jx79sjshYHU3P/LG76OP9RJ2iwdXreTzYLaMmNb5yCfUWhDKrrtMKZ\nIyJ9r1am9zW5lB7rLx9cTfmHD2f7xt/rG7QxK47taJC1Ab8+f3KjR2BOnIgu9lUG\nuQs5E+TDAgMBAAECggEACcBffJWnvbFe4LrQW7ZRP6CJ1BlekzMB1X6HE8NK6mYy\nxIm5olOofhaXiRgHyMNXvcnVvUZ3OzWk/8cNVKZHU05D7I+tOWfv5SpGNhS5lqS2\ngE2TvnT3J2YphppTXv+Xdi/KGnmaduHbXb8e9EJBClH3GZEMM2FGSkHGItN5oCmj\n575+CsWNGsbnNYacFD8kAWbvgpfNsiT3jzWuU8v7WHtn3WDFsk8ip+ddIW71FEmN\n5c3Cn5Uqg/ipY64QFpRT/1iLBBuEuhuBJtqHkrFWCrJsjWZzeXiadfj8OfE5L6Jn\nCYv7zsmaXBfJwq5D/AlA+jT9nF91fPWNvKGys6LjVQKBgQDxTpuF3+AFdGR4EW83\njnP5yyRDKaIZBp53QC4VmqKHnMnudAZSA1YDVq7uiupt6tgBtFvy7SCXE7dj1rWk\nPhJV4L0KVLSFb2BGGkzguWRmrqkGSoe7FKsJwrcHwoMuLyma77Qdemhe6Gmb4QiN\nZwSogS+7PGn2kpm2BziE5lgIzQKBgQDAJeO4uvZJf3zJSmsfhiaPefEuI/iA7oKB\nTVbQVFoCB9Bwptui8vRKMIOnGMNmXH32OPOfdKC8YrjOX0FKxdkUmDUWNpOBi4yW\nJyUEevxGH4W0sDx2/1IjIBrm9necltjJNj4sCu3o+hDsc1UInDk84Is7xYqMW1Da\nejE8xHPjzwKBgBpyoisfKX+PjT93sbfmHiH/uN6/nmudxRqO5z4o761ratp+zv6I\nLRI6mvu8MAuSFNDDAtzyToMgfxYrP0dcIkhVVILgW9TQKz4jvc9XooB6nj35Rz0i\n+8gbFlJ8aEJUmvvHT/d3Jh9Y29Jg7L4Kz4Dkf+XGrlp/IOfJjNFMKdP1AoGAYElc\nYPDHhDMvjAsPvT9TSWiY9D8wQyPCIBtqWoE6jXPu/tSOkYxf4GGJR43ANSY6NM17\nP7eI6H4sD7ZqGJcmXgyb5aK5rhwI+iFpimI60sTvEomR8yuktFddQ8nUTJLG1aWp\n6BYd/DZ7jpGI1gS7Jgd7nhsyf30u+hxrWgEz9b8CgYAN2F8WWJmdUwnpcoan98dE\n8MLr3C/QnULqyMjVK8UQ1c9/lGEyM2iCBwnhKS+Z5OBf8x0eiUGqLEpQh1O44AFT\na4t2ucpZ4Rf3zpNxOVDLG3EEr19romQZLTIImMwnbkmygHPxxyktZCG0IWydryFB\nF/If251S4b9b8V0rLcADnA==\n-----END PRIVATE KEY-----`
};

const sa2 = {
  name: 'kkv-finance-management',
  email: 'kkv-finance-management@kkv-finance-management.iam.gserviceaccount.com',
  key: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDTBuoHJ0JOFIii\nrUqLMMT4TRa+KbCP+iPc5TfvG3RdeOWIDGV3oogQrI4/drLm5uqIrnmNOp/oam6L\nOgU52s5F3Fmok4KMJOvetLJHtw3C8MxYC0uguhV6KuW3R+yt8xhQJfEFA6NAWGK/\nbhLN6EWhWxzMPIgMdIN688RYYbgAM9KFtESjqBa5to8eF5FQ2FfvJtX+FzG/wPd9\njAdTHBwde6J6SMw2u2RKtQXr91HVEaXGNRmVi1xqJ7IMkONeDnJnEIS06M25x4ZT\nsEocsdau85eRRjPWaeDadfR7e23hcfk2G5IGUAHUn004/RelrUX9IkhehjLv02iA\nFE+h7VzrAgMBAAECggEAS9SKODPVUbVzO/HFfaryvL8G0yKr/bDHPlNn/BYDhKsy\n3+aEd68B8evv2cJPm0WTNbZsm2FboOrN+l3JDvcfdF8wILGREccasxZ/keGnokth\nQqocbQ8xNItBrNC9rexS6koYB9M80JxyL5PgUfmLO+Y/vOxrfv5HWOFLxu6mbfuK\nMLoo5A+fKRt3sBcluD83KOYEaqb+EsqT9ExyTr0L4WsU/c8w4o/UTknI/JY++vl1\nhkbfrDMYiBx9477RoA9EjfGG6zAeqb0kpq/eQP9VvH+BjQE4OMj3SHnydd9eM7S1\n4vPD8Ybo1NKrWf1hkInJIvUVmYwgLsn0YYNEylvJcQKBgQDtPGwBqmNTYPEQBIPf\nXjrADBITMYBLThnFTFvs6g0exAdNQBepxq1ZPaC+pn/Mrh+rr0XoT3iCGAeA3wi/\n67cKNfmbEHJUJg3B2k4mjFipvKamINLOFfyMd2UmDlGE0B/s0QRt4W5lH3plpHtX\n6BDLDRbfd6pse1UI7MVDfa5XrQKBgQDjt89BZ+yy5xTBZJiRMM5uE/EoGtd2hhUh\nz8iyTTy0ReCIhr1r5zWaMUFVZiFSZTp0tikyrNtL8qDVXPaApAKGB2lCE7M4h5MW\nBsJgQViaMluTAzzK5AEPD6HUiZ/gS1vmyWKjSwF1ckCqexVrJbxgtcEuFeixOdXC\nZNoklR559wKBgCESOzxANHh7Gx/QgVGyIR6EkEB8thXJXW5TprzwI8QWL65lMOdJ\n+wBlxvLM4yP1YhTc6jHoYjRAhUtBzEZ05Z9WxuUG9eklJOXROPPGvNVspw6hpMF1\n7y7ltgQIGvUYzlqFCMkIlAskyDtDIq6ueyjTOk0MsYVN7BzCZP1zl8pBAoGAU7C8\nNReSwHV5BVKJV+MOGxqtKMYkpeTFY3XQFueYBdEgokyS1VNWOeMcVdyBJp0ZjMde\nAMfSmOkE/yV5WvHsE4IpxyUiWwZIonG9gk7B13nmefNYpmCBmx1tpoUmAvLvRbSB\n0e3BDX7+ESnHR2fJAeoKo3td17SfwR/7pDJBzyUCgYEAwdUi68k5QVSmgt4BagCV\nuEUJ76uP+q0ZLaS47wsaf81eemItegK1VaC2LfU48kvAFA12F7tYWIjqFx6o4B5J\n0IsLW3+lpw/K2sicicxqOitvcg/Z2yZIkRiAeVwoQH207kq7QICecOFZsxEidEUT\nfdKhFMv1RdOA3D6n17cfoFA=\n-----END PRIVATE KEY-----`
};

const sa3 = {
  name: 'key file (kkv-gold-507605)',
  email: 'kkv-finance@kkv-gold-507605.iam.gserviceaccount.com',
  key: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDWQp+HlA3TduWX\nsnTHncka32MinFGmQcGfvbEX++dblTNHNqvOao6AapzNaHsq1Uf/vpPcuFDMIZOB\nXj/xApDGlMrGzO9ZqlAlIzeLAJ1/8qN7ckhDGcBfZNqN20XFXOZTS90G2zAnChSV\nqBEoamp1GjoxBLeJyVsa8cf1z+O9eU8naY1y+q3IJG7W7XHxWEQrzA/kq/QSG20X\nGnv8SBVI27XlQO7L1JoY6b2xsIi3r3Dikf6SxT9uUf2ha656vGC/mypYS7a9p8Rm\nllCyLjyjgXlZ/uTQ1hzvyNTgzh3UzQF+7ysfnpcbKTOvOG9MpS2fYZiIOcL54m1X\nhyRKeH5BAgMBAAECggEAGOUrLHF/Um5ICrfBX5Oi/dHYmXloop+U/q688yihqbUC\nJ8ifmX+CaO5k+ML76K6udnXvhUpkl6C2cbuAmiGDrpHe+87CaCc6DQ6fUgczcF3s\n2+zxSNv8S7k9Yb/exqoJgxfXVIgcULTto7P1sRNS+kyerU+7KbHb5EYVR1JX8mL9\npyd0Qwp+AZqb5UU8oMznN3RfaM92DnZg5VIBeaoND58OPMla1vwQ2QBaU+6ZYkeK\n5Bt4PMAbtlTyfv41H+C20yxgb9DprWJut9Occhpks10CsPDhtI25vGmMOhG82Kb5\nmMyig8pdiiycpLFkSrYdU11FVatTMJPMUfbesEiOHwKBgQD4o5HxaCggWtqoJEHk\nLAUBx3DWrzJmkxbSiMErT714T/P64jKeKKPsNaYfaRHY/OJI2ZuZUYqq3qoSQoGC\nhMg5df5HEzOsdmRyXE3L4bjEvCIdBSMxE1d5/Jhe6Q7UTiOSi3WfsJqWpFqgrBd0\nTxQL0gSqy2WFf4gfbFfitNRpGwKBgQDcmn9f8CBZkpWKkcxDMqm+G41hontbFQEB\ndiQmCjaTb4TVv+fADgzO6QAlWoYzlI6evLs81Q4TfutyuhIADVAX8FfU25wCmnQ/\ntwV39B3mBipnaRJd26twvGdjkDEiQfIi7iICEhHhe7RdDipu8XNYP4uZ9Nw8IvBv\n7/8y6RRn0wKBgDd+Ml2B1Krb/D9Y0Ef/tyJdhAa2VXZlT8uvcAWdp3kJxzdwcsGv\n6l4W3zvVdIFMd6iwwLSoaV2Xkre+li8uOY3xks4EMB1G00Ze6ZIej+GA59A4TFFw\nsq5sPQm51HB3/CKB87+vZ+FFT2Da5+UynRPCTP5dpQv1mckBol/b4iiPAoGBAJ+F\nvTwD6XC8VhTpD1s8ZJCLXfZPR4J6ssp6wvMbCZId32GuLwirYEmzJZ7dUhQ0hdl1\nwrPfoRkp+1pwARo2hkd5ThonYC5lwFBeqb6vMXun07wJt/VVJykTpHPTziPmqhDm\nQINcy79Q9AEigD7PrMgQ04NWFHgMD+/yDYmkEFRvAoGAXv/TdObC9b0bGoLmcwZM\n54wuW1tHiNaTWRSH8VdRTHwkf+HFNAe62k4FjG+z74AAmyUb+0mBqt+BaRvS7ASa\nRsMlp6JwXz+pxgsatiGxI+btUx2Um7ETXgtzrTlFkIVhViTtxEQLWw6V8B5D2VrT\nd3UI9sdGr0vNk1mf1yi6NSU=\n-----END PRIVATE KEY-----`
};

const folderId = '1xCCRJaN8dWABu7HwfVW13Hp0DTMh_jM';

async function testAll() {
  for (const sa of [sa1, sa2, sa3]) {
    console.log(`\n=== Testing ${sa.name} (${sa.email}) ===`);
    try {
      const auth = new google.auth.JWT(
        sa.email,
        null,
        sa.key,
        ['https://www.googleapis.com/auth/drive']
      );
      const drive = google.drive({ version: 'v3', auth });

      // 1. Try files.get for folderId
      try {
        const fRes = await drive.files.get({
          fileId: folderId,
          fields: 'id, name, mimeType, capabilities',
          supportsAllDrives: true
        });
        console.log('✅ Found folder:', fRes.data);
      } catch (fErr) {
        console.log('❌ Folder get failed:', fErr.message);
      }

      // 2. List all accessible files/folders
      const listRes = await drive.files.list({
        fields: 'files(id, name, mimeType, parents)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      console.log('Accessible files/folders count:', listRes.data.files.length);
      listRes.data.files.forEach(f => console.log(` - [${f.mimeType}] ${f.name} (id: ${f.id})`));
    } catch (err) {
      console.log('❌ SA Auth/List error:', err.message);
    }
  }
}

testAll();
