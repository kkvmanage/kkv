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

const folderIdAccurate = '1xCCRJaN8dWABu7HwfVvW13Hp0DTMh_jM';

async function check() {
  for (const sa of [sa1, sa2]) {
    console.log(`\nTesting ${sa.name}...`);
    const auth = new google.auth.JWT(
      sa.email,
      null,
      sa.key,
      ['https://www.googleapis.com/auth/drive']
    );
    const drive = google.drive({ version: 'v3', auth });

    try {
      const res = await drive.files.get({
        fileId: folderIdAccurate,
        fields: 'id, name, mimeType, capabilities, trashed, shared, owners',
        supportsAllDrives: true
      });
      console.log('✅ Access granted to', res.data.name, '(id:', res.data.id, ')');
      console.log('Capabilities:', res.data.capabilities);

      // Test creating a small test file in this folder
      const createRes = await drive.files.create({
        requestBody: {
          name: 'service_account_test.txt',
          parents: [folderIdAccurate],
          mimeType: 'text/plain'
        },
        media: {
          mimeType: 'text/plain',
          body: 'KKV Gold Finance Service Account Write Verification OK'
        },
        fields: 'id, name, size, parents',
        supportsAllDrives: true
      });
      console.log('✅ Created test file in folder:', createRes.data);

      // Clean up test file
      await drive.files.delete({ fileId: createRes.data.id, supportsAllDrives: true });
      console.log('✅ Cleaned up test file successfully!');
    } catch (err) {
      console.log('❌ Error:', err.message);
    }
  }
}

check();
