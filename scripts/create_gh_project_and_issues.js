(async () => {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN not set in environment');
    const owner = 'jitsungwu';
    const repo = 'sa2026';
    const graphqlUrl = 'https://api.github.com/graphql';
    const restBase = `https://api.github.com/repos/${owner}/${repo}/issues`;
    const headersAuth = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'sa2026-script' };

    const gql = async (query) => {
      const res = await fetch(graphqlUrl, { method: 'POST', headers: headersAuth, body: JSON.stringify({ query }) });
      const data = await res.json();
      if (!res.ok || data.errors) throw new Error(JSON.stringify(data.errors || data, null, 2));
      return data.data;
    };

    console.log('Fetching repository and owner node IDs...');
    const repoQuery = `query { repository(owner: \"${owner}\", name: \"${repo}\") { id owner { id login } } }`;
    const repoData = await gql(repoQuery);
    const repoId = repoData.repository.id;
    const ownerId = repoData.repository.owner.id;
    console.log(`repoId=${repoId}; ownerId=${ownerId}`);

    let projectId;
    let projectUrl;
    const projectNumber = process.env.PROJECT_NUMBER || process.argv[2];
    if (projectNumber) {
      console.log(`Using existing Project (v2) number ${projectNumber} for owner ${owner}...`);
      const projQuery = `query { user(login: \"${owner}\") { projectV2(number: ${projectNumber}) { id title url } } }`;
      const projLookup = await gql(projQuery);
      if (!projLookup.user || !projLookup.user.projectV2) throw new Error(`Project number ${projectNumber} not found for user ${owner}`);
      projectId = projLookup.user.projectV2.id;
      projectUrl = projLookup.user.projectV2.url;
      console.log(`Found project id=${projectId} url=${projectUrl}`);
    } else {
      console.log('Creating Project (v2) named sa2026...');
      const createProjM = `mutation { createProjectV2(input:{ownerId:\"${ownerId}\", title:\"sa2026\"}) { projectV2 { id title url } } }`;
      const projData = await gql(createProjM);
      projectId = projData.createProjectV2.projectV2.id;
      projectUrl = projData.createProjectV2.projectV2.url;
      console.log(`Created project id=${projectId} url=${projectUrl}`);
    }

    const issues = [
      { title: '教師：透過 Excel 批次匯入學生名單', body: '身為 授課教師，我想要 透過上傳 Excel 檔案批次匯入名單，因此我可以 確保學生資訊準確並快速開啟課程。' },
      { title: '教師：在介面中切換班級', body: '身為 授課教師，我想要 在介面中自由切換不同班級，因此我可以 針對不同授課時段進行獨立的數據記錄。' },
      { title: '教師：設定倒數計時與提醒音效', body: '身為 授課教師，我想要 設定各階段的倒數計時與提醒音效，因此我可以 準確掌控教學進度而不需頻頻看錶。' },
      { title: '教師：發言名單權重排序（優先發言少者）', body: '身為 授課教師，我想要 系統自動對發言名單進行權重排序（發言少者優先），因此我可以 引導學生將發言權交給尚未參與的同學。' },
      { title: '教師：含隨機擾動的抽點功能', body: '身為 授課教師，我想要 在冷場時使用隨機抽點功能，因此我可以 主動挑選低參與度的同學發言以活絡課堂氣氛。' },
      { title: '學生（報告組）：在台上給予 1–5 點', body: '身為 報告組同學，我想要 在台上直接點選發問同學並給予 1-5 點，因此我可以 實質回饋對我們報告有幫助的建議。' },
      { title: '學生（報告組）：虛擬座位表介面', body: '身為 報告組同學，我想要 在操作介面查看「虛擬座位表」，因此我可以 直覺地對應台下同學的位置來給分。' },
      { title: '學生（被發問者）：即時加分通知', body: '身為 發問同學，我想要 在獲得加分時從螢幕看到即時通知，因此我可以 確認點數已成功入帳並獲得正面鼓勵。' },
      { title: '學生：登入後查看個人累計點數', body: '身為 在班學生，我想要 登入後查詢自己目前的累計點數，因此我可以 瞭解自己的平時表現並適時調整參與度。' },
      { title: '教師：限制單場報告總點數上限', body: '身為 授課教師，我想要 限制單場報告的總點數上限，因此我可以 防止學生濫發點數，維持成績的鑑別度。' },
      { title: '教師：檢視紀錄牆並微調點數', body: '身為 授課教師，我想要 審視紀錄牆並能微調點數，因此我可以 修正不合理的給分，確保評分符合教學目標。' },
      { title: '助教：匯出全班點數總表（Excel）', body: '身為 助教 (TA)，我想要 一鍵匯出全班的點數總表（Excel），因此我可以 快速將數據轉入學校的官方成績系統。' }
    ];

    const created = [];
    for (const it of issues) {
      console.log(`Creating issue: ${it.title}`);
      const res = await fetch(restBase, {
        method: 'POST',
        headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'sa2026-script' },
        body: JSON.stringify({ title: it.title, body: it.body })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to create issue ${it.title}: ${res.status} ${err}`);
      }
      const issueResp = await res.json();
      const issueNodeId = issueResp.node_id;
      const issueNumber = issueResp.number;
      const issueUrl = issueResp.html_url;
      console.log(`Created issue #${issueNumber} -> ${issueUrl}`);

      const addM = `mutation { addProjectV2ItemByContent(input:{projectId:\"${projectId}\", contentId:\"${issueNodeId}\"}) { item { id } } }`;
      try {
        await gql(addM);
        console.log(`Added issue #${issueNumber} to project.`);
      } catch (e) {
        console.warn('Project add returned warning:', e.message);
      }
      created.push({ number: issueNumber, url: issueUrl });
    }

    console.log('Done. Summary of created issues:');
    console.log(JSON.stringify(created, null, 2));
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
