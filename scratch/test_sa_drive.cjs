const path = require('path');
const { google } = require(path.resolve(__dirname, '../backend/node_modules/googleapis'));

const serviceEmail = 'kkv-gold-finance-drive@client-2-507109.iam.gserviceaccount.com';
const privateKey = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC1HquntuQhBPBM\nvNwEHKe8gtgty3La2/r1LgDRs8wHxXZsENg1ffk7+G1iv4dUtrkEbmPW803J3fz7\nwmlAXJMa/vb0ZiNELKQxWQMuiZt4NFIOu9c6a2vgBwg3tY9HD+LRZ0yGfYK84Fla\n+rff3+GR3ckwcHBXdbEaFk1PvifOCZs1n40NgzDnVDaLG3/hbyHQTpIr2optd93n\nGiP2xaBGz7jx79sjshYHU3P/LG76OP9RJ2iwdXreTzYLaMmNb5yCfUWhDKrrtMKZ\nIyJ9r1am9zW5lB7rLx9cTfmHD2f7xt/rG7QxK47taJC1Ab8+f3KjR2BOnIgu9lUG\nuQs5E+TDAgMBAAECggEACcBffJWnvbFe4LrQW7ZRP6CJ1BlekzMB1X6HE8NK6mYy\nxIm5olOofhaXiRgHyMNXvcnVvUZ3OzWk/8cNVKZHU05D7I+tOWfv5SpGNhS5lqS2\ngE2TvnT3J2YphppTXv+Xdi/KGnmaduHbXb8e9EJBClH3GZEMM2FGSkHGItN5oCmj\n575+CsWNGsbnNYacFD8kAWbvgpfNsiT3jzWuU8v7WHtn3WDFsk8ip+ddIW71FEmN\n5c3Cn5Uqg/ipY64QFpRT/1iLBBuEuhuBJtqHkrFWCrJsjWZzeXiadfj8OfE5L6Jn\nCYv7zsmaXBfJwq5D/AlA+jT9nF91fPWNvKGys6LjVQKBgQDxTpuF3+AFdGR4EW83\njnP5yyRDKaIZBp53QC4VmqKHnMnudAZSA1YDVq7uiupt6tgBtFvy7SCXE7dj1rWk\nPhJV4L0KVLSFb2BGGkzguWRmrqkGSoe7FKsJwrcHwoMuLyma77Qdemhe6Gmb4QiN\nZwSogS+7PGn2kpm2BziE5lgIzQKBgQDAJeO4uvZJf3zJSmsfhiaPefEuI/iA7oKB\nTVbQVFoCB9Bwptui8vRKMIOnGMNmXH32OPOfdKC8YrjOX0FKxdkUmDUWNpOBi4yW\nJyUEevxGH4W0sDx2/1IjIBrm9necltjJNj4sCu3o+hDsc1UInDk84Is7xYqMW1Da\nejE8xHPjzwKBgBpyoisfKX+PjT93sbfmHiH/uN6/nmudxRqO5z4o761ratp+zv6I\nLRI6mvu8MAuSFNDDAtzyToMgfxYrP0dcIkhVVILgW9TQKz4jvc9XooB6nj35Rz0i\n+8gbFlJ8aEJUmvvHT/d3Jh9Y29Jg7L4Kz4Dkf+XGrlp/IOfJjNFMKdP1AoGAYElc\nYPDHhDMvjAsPvT9TSWiY9D8wQyPCIBtqWoE6jXPu/tSOkYxf4GGJR43ANSY6NM17\nP7eI6H4sD7ZqGJcmXgyb5aK5rhwI+iFpimI60sTvEomR8yuktFddQ8nUTJLG1aWp\n6BYd/DZ7jpGI1gS7Jgd7nhsyf30u+hxrWgEz9b8CgYAN2F8WWJmdUwnpcoan98dE\n8MLr3C/QnULqyMjVK8UQ1c9/lGEyM2iCBwnhKS+Z5OBf8x0eiUGqLEpQh1O44AFT\na4t2ucpZ4Rf3zpNxOVDLG3EEr19romQZLTIImMwnbkmygHPxxyktZCG0IWydryFB\nF/If251S4b9b8V0rLcADnA==\n-----END PRIVATE KEY-----`;

const folderId = '1xCCRJaN8dWABu7HwfVW13Hp0DTMh_jM';

async function testDriveSA() {
  console.log('Testing Google Drive Service Account auth for folder:', folderId);
  try {
    const auth = new google.auth.JWT(
      serviceEmail,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/drive']
    );

    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, trashed, capabilities, driveId, shared, owners',
      supportsAllDrives: true
    });

    console.log('✅ Success! Folder info:');
    console.log({
      id: res.data.id,
      name: res.data.name,
      mimeType: res.data.mimeType,
      trashed: res.data.trashed,
      capabilities: res.data.capabilities
    });
  } catch (err) {
    console.error('❌ Error testing Drive SA:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
  }
}

testDriveSA();
