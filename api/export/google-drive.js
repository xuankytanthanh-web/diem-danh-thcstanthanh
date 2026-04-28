import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse cookies manually
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    }).filter(([k]) => k)
  );

  const tokenCookie = cookies['google_tokens'];
  if (!tokenCookie) {
    return res.status(401).json({ error: 'Chưa xác thực với Google' });
  }

  let tokens;
  try {
    tokens = JSON.parse(tokenCookie);
  } catch {
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(tokens);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Parse body
  let students, history;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    students = body.students;
    history = body.history;
  } catch {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  }

  try {
    // 1. Tìm hoặc tạo thư mục "DIEM DANH"
    let folderId = '';
    const folderSearch = await drive.files.list({
      q: "name = 'DIEM DANH' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (folderSearch.data.files && folderSearch.data.files.length > 0) {
      folderId = folderSearch.data.files[0].id;
    } else {
      const folder = await drive.files.create({
        requestBody: {
          name: 'DIEM DANH',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });
      folderId = folder.data.id;
    }

    // 2. Tạo file JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Diem_Danh_Xuat_${timestamp}.json`;
    const fileContent = JSON.stringify(
      { students, history, thoiGianXuat: new Date().toISOString() },
      null,
      2
    );

    // 3. Upload lên Drive
    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId]
      },
      media: {
        mimeType: 'application/json',
        body: fileContent
      },
      fields: 'id, name, webViewLink'
    });

    res.json({
      success: true,
      fileName: file.data.name,
      link: file.data.webViewLink
    });
  } catch (error) {
    console.error('Google Drive Export Error:', error);
    res.status(500).json({ error: 'Xuất ra Google Drive thất bại' });
  }
}
