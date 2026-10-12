/* StageLab · productions/data.js  —  胡桃夹子 · 镜框式剧场
 * 知识卡与来源。四种证据状态在正文里用小标签标出（教师用的说明，不是学生要背的分类）：
 *   制作事实  fact   来源直接记录的效果、设备或人员工作
 *   场所资料  venue  McCaw Hall 发布的技术资料；说明场所能力，不等于这一版用过
 *   教学编排  teach  课堂设计的镜头、简化小人、互动和压缩时长
 *   待核查    open   机构细节、原始 cue、准确轨迹或站位尚未取得
 */
(function () {
  'use strict';
  const SL = (window.SL = window.SL || {});

  const SRC = {
    P1: { label: 'PNB 官方剧目档案：George Balanchine’s The Nutcracker', url: 'https://www.pnb.org/repertory/the-nutcracker/', note: '2015 年首演，编舞、复排、舞美服装与灯光署名。页面中的历史介绍包含其他制作，不混用其机械数据' },
    P2: { label: 'PNB 2025–26 季新闻稿（PDF）', url: 'https://www.pnb.org/wp-content/uploads/2025/11/25-26-PNB-Nutcracker-Press-Release.pdf', note: 'McCaw Hall 场所、该制作的延续；不等于 2024 年逐场记录' },
    P3: { label: 'PNB：舞台监督 Sandy Barrack 的后台说明（2024）', url: 'https://www.pnb.org/blog/behind-the-scenes-of-the-nutcracker-with-pnb-production-stage-manager-sandy-barrack/', note: '雪袋、幕间扫雪、姜饼妈妈的准备、后台人员分工。未提供全剧换景运行表，也没有说明圣诞树的内部结构' },
    P4: { label: 'PNB：The Nutcracker by the Numbers', url: 'https://www.pnb.org/blog/george-balanchines-the-nutcracker-by-the-numbers/', note: '序曲动画、开场走廊纱幕、制作圣诞树用时、小丑娃娃服装等数据；网页有后续更新' },
    P5: { label: 'PNB 艺术总监 2024 年说明', url: 'https://www.pnb.org/blog/artistic-directors-notebook-george-balanchines-the-nutcracker-2024/', note: '该制作的延续与结尾的驯鹿飞行效果；证明可见效果，不证明驱动机构' },
    P6: { label: 'McCaw Hall：Susan Brotman Auditorium 技术资料（2022 修订）', url: 'https://www.mccawhall.com/assets/doc/Susan_Brotman_Auditorium_Tech_Info_2022-628a2d768b.pdf', note: '台口、舞台、侧台、搬运区、台仓、乐池、吊杆与幕布库存。是场所能力，不是这一版的使用清单' },
    P6b: { label: 'McCaw Hall 技术资料（2015，Spacefinder 托管）', url: 'https://www.spacefinderseattle.org/images/files/Susan_Brotman_Auditorium_Technical_Information_2015.pdf', note: '课程脚本最初引用的版本；网页数字以 2022 修订版为准' },
    P7: { label: '纽约城市芭蕾舞团：Balanchine 版本剧情', url: 'https://www.nycballet.com/discover/ballet-repertory/george-balanchines-the-nutcracker', note: '只用于核对剧情框架；布景、尺寸与设备不移植到 PNB' },
    P8: { label: 'PNB：Nutcracker 常见问题（2018）', url: 'https://www.pnb.org/blog/answering-nutcracker-faqs/', note: '景片材料、吊景、景物移动与后台工作的一般说明；不据此指定某场的具体动作' },
    P9: { label: 'PNB：后台摄影专题（2025）', url: 'https://www.pnb.org/blog/backstage-nutcracker-magic-photo-essay/', note: '背台、候场与制作摄影入口；图片未逐张作结构测读' },
    P10: { label: 'PNB 2019 节目册（PDF）', url: 'https://encorespotlight.com/wp-content/uploads/2019/11/nutcracker-2019-pacific-northwest-ballet-Encore.pdf', note: '同一制作的主创与节目说明；不当作技术日志' },
    Q1: { label: 'Queen Anne News：PNB 新版《胡桃夹子》（2015）', url: 'https://queenannenews.com/news/2015/dec/02/pnb-brings-new-production-of-nutcracker-to-its-sta/', note: '首演季报道：圣诞树长到最高约 40 英尺；舞美多用深紫与猩红' },
    Q2: { label: 'PNB：《胡桃夹子》学习指南', url: 'https://www.pnb.org/?p=9608', note: 'PNB 乐团 57 名乐手；每场约 70 名舞校学生' },
    Q3: { label: 'PNB 艺术总监手记（2023）', url: 'https://www.pnb.org/?p=143881', note: '布景与服装由 PNB 自己的布景工坊和服装工坊制作' },
    G1: { label: 'Theatres Trust：剧场包含哪些空间', url: 'https://www.theatrestrust.org.uk/discover-theatres/theatre-faqs/171-what-spaces-make-up-a-theatre', note: '台口、侧台、舞台塔与换景设施的一般功能；不作为统一尺寸标准' },
    G2: { label: 'Theatres Trust：舞台与观众厅的类型', url: 'https://www.theatrestrust.org.uk/discover-theatres/theatre-faqs/170-what-are-the-types-of-theatre-stages-and-auditoria', note: '镜框式的基本定义；上一章三种形制比较的共同来源' },
  };
  const ref = (...ids) => `<sup class="references">${ids.map((id) => `<a href="${SRC[id].url}" target="_blank" rel="noopener" aria-label="来源 ${id}：${SRC[id].label}">${id}</a>`).join('')}</sup>`;
  const ev = (k) => ({ fact: '<span class="ev fact">制作事实</span>', venue: '<span class="ev venue">场所资料</span>', teach: '<span class="ev teach">教学编排</span>', open: '<span class="ev open">待核查</span>' }[k]);
  const table = (head, rows) => `<div class="dimension-table"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  SL.DATA = {
    production: {
      title: 'George Balanchine’s The Nutcracker', company: '太平洋西北芭蕾舞团（Pacific Northwest Ballet, PNB）',
      venue: 'Marion Oliver McCaw Hall · Susan Brotman Auditorium，西雅图', premiere: '2015 年 11 月 27 日',
      credits: [['编舞', 'Choreography', 'George Balanchine'], ['复排', 'Staging', 'Judith Fugate、Peter Boal、Garielle Whittle'], ['舞美与服装', 'Sets & costumes', 'Ian Falconer'], ['灯光', 'Lighting', 'James F. Ingalls']],
    },
    sources: SRC,
    order: ['prosc', 'scenery', 'fly', 'drapes', 'change', 'wings', 'below'],
    notes: {
      /* ───────────────────────────── 01 */
      prosc: {
        zh: '台口与主舞台', en: 'PROSCENIUM & STAGE', short: '台口与主舞台', kind: 'structure', diagram: 'prosc', where: '前方',
        mini: ['台口是观众看向舞台的开口', '观众主要在一侧，舞台向后展开', '台口两侧与上方遮住了后台空间'],
        status: ['场所资料', 'McCaw Hall 2022'],
        takeaway: '台口属于剧场；台口里出现的家宅，属于这一次演出。',
        sections: [
          { title: '台口是什么／Definition', html: `<p>镜框式剧场里，观众厅与舞台之间隔着一道墙，墙上的开口就是<strong>台口</strong>。观众主要从一侧、透过这个开口看演出，开口四周的结构像一个画框。剧场图纸用“台口线”作为测量舞台位置的基准。${ref('G2', 'G1')}</p><p><em>A proscenium theatre separates house and stage with a wall; its opening frames the picture. The plaster line is the reference line for stage measurements.</em></p><p><strong>台口不是幕布，也不是布景。</strong>幕布挂在台口后面，可以升降；布景随剧目更换；台口是建筑的一部分。</p>` },
          { title: '从台口往里看／Spaces behind the frame', html: `<ol class="feature-list"><li><strong>台唇</strong>：台口线以前、伸向观众的一条舞台面。</li><li><strong>主舞台</strong>：台口后面的表演区，也是布景搭建的地方。</li><li><strong>侧台</strong>：主舞台两侧，被侧幕挡住。</li><li><strong>舞台塔</strong>：主舞台上空，高过观众厅的屋顶。</li><li><strong>台仓与乐池</strong>：舞台面以下，以及台口前方的乐队区。</li></ol><p>观众只看得见台口框住的那一部分。后面的卡片会沿着 Clara 的旅途，一处一处打开其余空间。</p>` },
          { title: '这一版在哪里演／In this production', html: `<p>${ev('fact')} <strong>George Balanchine’s The Nutcracker</strong>，太平洋西北芭蕾舞团（PNB），2015 年首演；舞美与服装 Ian Falconer，灯光 James F. Ingalls。演出场所是西雅图 McCaw Hall 的 Susan Brotman 观众厅。${ref('P1', 'P2')}</p><p>${ev('fact')} 序曲期间放映一段动画，画面走向一座家宅。${ref('P4')}</p><p>${ev('teach')} 开场时台口亮起的金色边框，只为指出“画面边界”在哪里；真实演出没有这道光。</p>` },
          { title: '关键尺寸／Key dimensions', html: `${table(['参数', '用它判断什么', 'McCaw Hall'], [['台口宽 × 高', '画面边界；景物能否通过开口', '60′ × 35′（约 18.3 × 10.7 m）'], ['台唇边到台口线', '台口前可用的深度', '4′10.5″（约 1.5 m）'], ['台唇边到后墙', '舞台总进深', '74′（约 22.6 m）'], ['舞台面高出观众席地面', '前排能否看见台面', '3′6″（约 1.07 m）'], ['一楼楼座栏杆到台口线', '远处观众离舞台多远', '84′（约 25.6 m）']])}<p>${ev('venue')} 数字来自场所技术资料。${ref('P6')} 沙盘比例为示意，不按这些数字缩放。</p>` },
          { title: '和上一章连起来／Connect', html: `<p>上一章用《哈姆雷特》比较了镜框式、中心式和伸出式的观看关系。这一章停在镜框式里，看台口背后的空间怎样支持一场演出。${ref('G2')}</p>` },
        ],
        model: '模型保留台口墙、台唇、主舞台、观众席与乐池的前后关系。台口宽高比、舞台进深与座席数量都是示意，不是 McCaw Hall 的测绘。',
        sources: ['P1', 'P2', 'P4', 'P6', 'G1', 'G2'],
      },

      /* ───────────────────────────── 02 */
      scenery: {
        zh: '布景与剧场', en: 'SCENERY & BUILDING', short: '布景与剧场', kind: 'structure', diagram: 'scenery', where: '前方',
        mini: ['建筑不变：台口、舞台、观众席', '布景属于一次演出，可进可出', '景物尺度一变，人物的世界就变'],
        status: ['制作事实', 'PNB 公开资料'],
        takeaway: '同一个台口里，可以先后出现家宅、雪林和糖果国。',
        sections: [
          { title: '两种东西／Two kinds of things', html: `<p><strong>剧场建筑</strong>提供空间和设备：台口、舞台面、侧台、舞台塔、观众席。<strong>布景、道具和服装</strong>属于这一版演出，要制作、运输、安装、存放。${ref('G1')}</p><p>${ev('fact')} 这一版的布景与服装由 PNB 自己的布景工坊和服装工坊制作。${ref('Q3')}</p>` },
          { title: '布景的四种状态／Four states', html: `<ul class="feature-list"><li><strong>在场</strong>：观众正看得见。</li><li><strong>离场</strong>：刚刚撤下，正在被收走。</li><li><strong>准备中</strong>：在侧台或上方等候出场。</li><li><strong>存放中</strong>：这一场用不到。</li></ul><p>${ev('teach')} 沙盘里，景物在状态之间“叠化”。叠化只表示状态改变，不代表真实的搬运路线——真实的换景要靠工作人员一件一件完成。</p>` },
          { title: '房间为什么变大／Why the room grows', html: `<p>树和家具变大，Clara 仍是原来的大小。观众看到的是：世界变大了，或者说，她变小了。尺度是布景最直接的语言之一。</p><p>${ev('fact')} 这棵圣诞树制作用了约 400 小时；首演季的报道写到，它长到最高时约 40 英尺（约 12.2 米）。${ref('P4', 'Q1')}</p><p>${ev('venue')} McCaw Hall 的台口高 35 英尺（约 10.7 米）。${ref('P6')}</p><p>${ev('teach')} 两个数字放在一起是课堂推算：树长到最高时，树顶可能超出台口上沿，观众看见的是被“画框”截断的树。具体站位未核实。</p><p>${ev('open')} 树怎样长高——靠升降、伸展还是其他机构——本课没有取得资料。沙盘只表现前台的尺度变化，不画内部机构。</p>` },
          { title: '设计时要核对什么／What to check', html: `${table(['关注参数', '用它判断什么'], [['景物最大宽、高', '能否通过台口；是否超出画面'], ['景物在哪里存放', '上方、侧面、台下或场外'], ['在哪个时间换', '幕间，还是在观众眼前'], ['重量与移动方式', '吊挂、推移，或由人搬运']])}` },
        ],
        model: '家宅、雪林、糖果国均为课堂几何模型：取“家庭建筑、白桦雪林、糖果柱与宝座”这几个容易辨认的特征，配色参考该版的公开影像与报道，形状、尺寸与位置都不是原设计图。',
        sources: ['P4', 'Q1', 'Q3', 'P6', 'G1'],
      },

      /* ───────────────────────────── 03 */
      fly: {
        zh: '舞台塔与吊挂系统', en: 'FLY TOWER & RIGGING', short: '舞台塔与吊挂', kind: 'machinery', diagram: 'fly', where: '上方',
        mini: ['台口上方的高空间：舞台塔', '景物挂在吊杆上，配重反向运动', '吊杆组在锁绳栏操作，也负责摇雪袋'],
        status: ['制作事实', 'PNB 舞台监督说明 · McCaw Hall'],
        takeaway: '你看见雪，他们在控制雪。',
        sections: [
          { title: '舞台塔／The fly tower', html: `<p>主舞台上空是一座高高的<strong>舞台塔</strong>。顶部的<strong>栅顶</strong>装着滑轮；一道道<strong>吊杆</strong>（长金属管）横跨舞台，可以挂幕布、景片、灯具和效果装置。景物升到高处，观众就看不见了。${ref('G1')}</p><p>要把和台口一样高的景物完全升出视线，舞台塔大约要有台口高度的两倍以上，再加上滑轮和检修所需的空间。</p>` },
          { title: '平衡重吊杆怎样运作／How a counterweight set works', html: `<ol class="feature-list"><li>几根钢丝绳把吊杆吊起，向上绕过栅顶的滑轮，汇到侧墙上方的头滑轮，再向下连到<strong>配重架</strong>。</li><li>配重架里装上与景物重量相当的铁块，沿侧墙的导轨上下滑动。</li><li>操作员在<strong>锁绳栏</strong>拉动手拉绳：吊杆下降，配重架就上升；吊杆升起，配重架就下降。两边平衡后，一个人可以平稳地移动很重的景物。</li><li>锁绳器把绳子锁住，景物停在预定高度。</li><li>换上或卸下景物时，要在高处的<strong>装载廊</strong>同时增减铁块，保持平衡。</li></ol><p><strong>单式与双式。</strong>单式系统里，配重走的距离和吊杆一样；双式系统用滑轮让配重只走一半，但要两倍重量，能把侧墙下部空出来。</p>` },
          { title: '雪从哪里来／Where the snow comes from', html: `<p>${ev('fact')} 舞台监督说明：三名在吊杆操作区工作的舞台工作人员负责“雪袋”。雪袋是三条约 50 英尺（约 15 米）长的帆布，挂在舞台上方，一侧开了几十个孔；道具组把细小的白色碎纸装进去。来回摇动雪袋，碎纸就从孔里飘落。${ref('P3')}</p><p>${ev('teach')} 沙盘里用两道吊杆交替升降来表现“摇动”，你拖动的控制只是这个原理的简化，不是剧场真实的操作界面；工作人员的位置和动作为示意。</p><p>${ev('open')} 每条雪袋怎样吊挂、配几道吊杆，资料没有说明。</p>` },
          { title: '吊挂空间与控制工作区／Fly space and fly rail', html: `<p><strong>吊挂空间</strong>是舞台塔的上部：景物在这里升起、收存、被遮住。<strong>控制工作区</strong>在舞台一侧：锁绳栏、天桥和装载廊。${ev('venue')} McCaw Hall 的锁绳栏在舞台右侧，舞台面和 40 英尺高的天桥上各有一处，另有两层装载廊。${ref('P6')}</p><p>${ev('fact')} 舞台监督还提到，有的工作人员负责让景物“飞”上飞下，另一些负责道具。${ref('P3')}</p>` },
          { title: '关键尺寸／Key dimensions', html: `${table(['参数', 'McCaw Hall', '用它判断什么'], [['栅顶高度', '100′（约 30.5 m）', '与 35′ 台口相比约 2.9 倍：景物能否完全升出视线'], ['吊杆数量与间距', '112 道，中心距 6″（约 15 cm）', '能挂多少层幕布、景片与灯具'], ['吊杆长度', '80′（约 24.4 m）', '能否覆盖台口宽度与侧面遮蔽'], ['系统类型', 'Clancy 平衡重，单式', '配重的行程与侧墙占用'], ['第一道吊杆', '台口线后 1′9″', '最靠前能挂什么'], ['电动点式卷扬机', '30 台，位于上场区', '可与平衡重系统配合']])}<p>${ev('venue')} 来自场所技术资料。${ref('P6')} ${ev('open')} 这一版用了哪几道吊杆、挂了什么，资料没有给出；沙盘只画出示意的几道。</p>` },
        ],
        model: '模型把吊杆操作区画在舞台右侧（与场所资料一致），保留栅顶、头滑轮、配重导轨、锁绳栏、天桥和装载廊的关系。吊杆数量、间距、雪袋吊法与操作员站位为示意。',
        sources: ['P3', 'P6', 'G1'],
      },

      /* ───────────────────────────── 04 */
      drapes: {
        zh: '幕与遮蔽', en: 'CURTAINS & MASKING', short: '幕与遮蔽', kind: 'structure', diagram: 'drapes', where: '前方',
        mini: ['主幕：观众与舞台之间可移动的边界', '侧幕、檐幕：遮住侧台与上空', '纱幕：随灯光改变透明程度'],
        status: ['场所资料', 'McCaw Hall 2022'],
        takeaway: '主幕落下，观众不再看见舞台；后台的工作就开始了。',
        sections: [
          { title: '主幕／Main curtain', html: `<p>主幕挂在台口后的第一道位置，决定观众此刻能不能看见舞台。${ev('venue')} McCaw Hall 的主幕是红色丝绒，竖直升降（俗称“断头台式”），电动、可调速；中缝可以分开，供人从幕前穿行。${ref('P6')}</p><p>${ev('open')} 这一版开幕、落幕的速度与时机未核实；沙盘按场所资料做成竖直升降。</p>` },
          { title: '防火幕／Fire curtain', html: `<p>台口线后紧贴着一道防火幕，平时收在台口上方。${ev('venue')} McCaw Hall 的防火幕是 9 英寸厚的框架式金属墙，位于台口线后 3 英寸；这个平面必须保持畅通——布景和道具不能放在这条线上。${ref('P6')}</p>` },
          { title: '侧幕与檐幕／Legs and borders', html: `<p>黑色丝绒的<strong>侧幕</strong>成对挂在两侧，挡住侧台；<strong>檐幕</strong>横挂在上方，挡住吊杆和灯具。它们和台口一起决定“观众能看见哪里”。位置要从最靠边、最靠前的座位检查视线。</p><p>${ev('venue')} McCaw Hall 库存黑丝绒侧幕 7 对（16′ × 45′）、檐幕 7 道（80′ × 16′）。${ref('P6')} ${ev('open')} 这一版是否使用这些库存幕布、挂在哪几道吊杆，未核实。</p>` },
          { title: '纱幕／Scrim', html: `<p>纱幕是稀疏的网纱：前面打光、后面暗时，看起来像一面实墙；后面的景物被照亮时，它就变得透明。${ev('venue')} McCaw Hall 有黑色和深蓝色的鲨齿纱幕。${ref('P6')}</p><p>${ev('fact')} 这一版开场的“走廊纱幕”上画着与《胡桃夹子》历史有关的人物：大仲马、霍夫曼、柴可夫斯基、彼季帕、伊万诺夫、巴兰钦和林肯·柯尔斯坦。${ref('P4')}</p><p>${ev('teach')} 开场时纱幕怎样退出，沙盘用叠化表示。</p>` },
          { title: '关键尺寸／Key dimensions', html: `${table(['关注参数', '用它判断什么'], [['主幕位置、升降方式与速度', '开幕、落幕的节奏'], ['侧幕宽度与对数', '能否从边座挡住侧台'], ['檐幕下沿高度', '能否从前排挡住吊杆与灯具'], ['纱幕位置与前后灯光', '纱幕何时显实、何时透明'], ['防火幕平面', '任何景物都不能停在这条线上']])}` },
        ],
        model: '模型画了主幕、四对侧幕与檐幕、三道灯杆和开场纱幕。幕布的数量与位置为示意；纱幕上的七个画框只表示“人物肖像”，不复制原画。',
        sources: ['P6', 'P4'],
      },

      /* ───────────────────────────── 05 */
      change: {
        zh: '幕间换景', en: 'THE INTERVAL CHANGEOVER', short: '幕间换景', kind: 'backstage', diagram: 'change', where: '侧面',
        mini: ['撤下：上一幕的景物与效果材料离开', '清理：扫掉落在台面的纸雪', '准备、再呈现：新世界在幕后形成'],
        status: ['制作事实', 'PNB 舞台监督说明'],
        takeaway: '换景不只是换画面，还有撤除、清理和重新准备。',
        sections: [
          { title: '观众看不见的幕间／The hidden interval', html: `<p>真实演出里，第一幕与第二幕之间有幕间休息。主幕落下、观众离座，舞台上的工作才开始。${ev('teach')} 课堂把这段时间压缩到一分多钟，不能理解成原演出几秒钟的无缝换景。</p>` },
          { title: '资料记下了什么／What is documented', html: `<p>${ev('fact')} 幕间，三人道具组要把落在舞台上的纸雪全部扫干净，第二幕开幕时，观众才会到达一个新的地方。${ref('P3')}</p>` },
          { title: '一个通用的次序／A general sequence', html: `<ol class="feature-list"><li><strong>撤下</strong>：上一场的景物、道具和效果材料离开表演区。</li><li><strong>清理</strong>：检查、清扫台面，排除会让演员滑倒或绊倒的东西。</li><li><strong>准备</strong>：新景物从上方降下、从侧面推入或在台面上组装，灯光与道具就位。</li><li><strong>重新呈现</strong>：主幕升起，新画面出现。</li></ol><p>${ev('teach')} 这是给初学者的归纳，不是该演出的技术运行表。上方的吊挂空间可以把幕布与景片升起收存；侧面的搬运区可以推出、暂存、换入地面景物。</p>` },
          { title: '还不知道的／Not yet known', html: `<p>${ev('open')} 每件景的撤入顺序、经过哪道吊杆或哪条路线，本课没有取得资料。所以沙盘只对照“转换前／转换后”两个状态，不编造“雪景上升、糖果景下降”这样的原版指令。</p>` },
          { title: '场所的支持空间／Support spaces', html: `${table(['空间', 'McCaw Hall', '用它判断什么'], [['舞台左侧布景搬运区', '70′ × 75′（约 21.3 × 22.9 m，含升降台）', '景物暂存与周转的面积'], ['布景升降机', '14′11″ × 36′3″（约 4.5 × 11 m）', '下层与舞台层之间运送景物'], ['电动侧幕帘', '80′ × 40′，黑丝绒', '遮住搬运区'], ['装卸平台到舞台', '138′ 直推', '装台、拆台的运输路线']])}<p>${ev('venue')} ${ref('P6')} 这些是场所能力，不表示这一版幕间用了升降机。</p>` },
        ],
        model: '扫雪的三名道具组成员按资料设置，扫的路线与站位为示意。转换前后的两个画面用叠化切换，不表示真实的换景路线。',
        sources: ['P3', 'P6'],
      },

      /* ───────────────────────────── 06 */
      wings: {
        zh: '侧台与候场', en: 'WINGS & ENTRANCES', short: '侧台与候场', kind: 'backstage', diagram: 'wings', where: '侧面',
        mini: ['侧台：台口两侧、观众看不见的舞台', '候场：演员和大型服装在这里等待', '出场时机：台上的表演为准备争取时间'],
        status: ['制作事实', 'PNB 舞台监督说明'],
        takeaway: '台上正在发生的表演，为台侧的准备提供了时间。',
        sections: [
          { title: '侧台是什么／The wings', html: `<p>侧台是主舞台两侧、被侧幕挡住的空间：演员在这里候场、上下场，道具和景物在这里暂放；侧幕之间的空隙就是出入口。${ref('G1')}</p><p>${ev('venue')} McCaw Hall 舞台右侧从台口量到锁绳栏约 19 英尺；舞台左侧量到侧幕帘约 24 英尺，再往外是布景搬运区。${ref('P6')}</p>` },
          { title: '一条大裙子怎样及时出场／Preparing Mother Ginger', html: `<p>${ev('fact')} 舞台监督的说明里，准备有清楚的先后：${ref('P3')}</p><ol class="feature-list"><li>五个人（道具组和服装组）帮扮演姜饼妈妈的演员穿上巨大的裙子。</li><li>一位舞台工作人员设计了一个架子，在合上裙子时替演员承担裙子的重量。</li><li>杏仁糖之舞（就在她出场前）一开始，把裙子的重量放到演员所穿背带的卡扣上。</li><li>舞台监督引导她走进侧幕。</li><li>出场前大约 45 秒，八个小丑娃娃钻到裙子底下。</li></ol>` },
          { title: '沙盘里的样子／In the model', html: `<p>${ev('teach')} 准备区放在舞台左侧上场的位置，只是为了看得清楚；裙子、架子、背带都简化成几何体。</p><p>${ev('open')} 原侧台方向、站位、步数、架子的详细连接和原版 cue 口令都未核实。</p>` },
          { title: '后台有多少人／People backstage', html: `<p>${ev('fact')} 每场演出后台有 45 人以上；服装组 20 多人，其中 16 名是穿衣员；三名追光操作员坐在观众席上方的高处，让主要舞者始终在光里。舞台监督说，如果大家都做好了，观众根本不会知道他们在那里。${ref('P3')}</p>` },
          { title: '设计时要核对什么／What to check', html: `${table(['关注参数', '用它判断什么'], [['侧台宽度与进深', '候场、暂放与大型服装的空间'], ['侧幕之间的出入口宽度', '大裙子、景车能否通过'], ['候场点到出场点的距离', '准备要提前多久完成'], ['与吊杆操作区、搬运区的关系', '人流与景物流是否交叉']])}` },
        ],
        model: '姜饼妈妈的裙子、支撑架、八个孩子与五名工作人员按资料设置数量；位置、路线和动作时长为课堂压缩。',
        sources: ['P3', 'P6', 'G1'],
      },

      /* ───────────────────────────── 07 */
      below: {
        zh: '乐池与台下', en: 'ORCHESTRA PIT & BELOW STAGE', short: '乐池与台下', kind: 'machinery', diagram: 'below', where: '下方',
        mini: ['乐池升降台：停在乐池层、观众席面或舞台面', '台仓：舞台面下的空间，台板可以打开', '乐池与台仓都属于剧场建筑'],
        status: ['场所资料', 'McCaw Hall 2022'],
        takeaway: '剧场提供条件，景物与工作人员把条件组织成演出。',
        sections: [
          { title: '乐池／The orchestra pit', html: `<p>乐池在台口前方、低于观众席，乐队在这里为演出现场伴奏。${ev('fact')} PNB 有自己的管弦乐团，共 57 名乐手。${ref('Q2')}</p><p>${ev('venue')} McCaw Hall 的乐池由两块弧形升降台组成：靠舞台的一块 9′1″ 深、67′ 宽，靠观众的一块 6′10″ 深、70′7″ 宽。每一块都能停在三个高度——升到舞台面，扩大台唇；与观众席齐平，摆放座椅；或降到乐池层，做成平地或两级台阶。乐池最多容纳 90 名乐手。${ref('P6')}</p>` },
          { title: '升降台怎样运作／How the lifts work', html: `<ol class="feature-list"><li>平台由机械驱动，整块上下移动。</li><li>控制系统预设几个停位，平台停在需要的高度。</li><li>升到舞台面时，乐池就变成台唇的一部分；与观众席齐平时，可以加座位。</li></ol><p>${ev('teach')} 沙盘里的升降是“场所功能示意”，不表示这一版在剧情中升降乐池。</p>` },
          { title: '台仓与活动台板／Below the stage', html: `<p>${ev('venue')} McCaw Hall 的舞台面是染黑并封漆的枫木。中部有一块 42′10″ × 25′10″ 的活动台板区，下面是两层台仓（乐池层与下层），台板大多是 6′ × 8′。${ref('P6')}</p><p>打开台板，演员或景物就可以从台下出现，或者把台面下沉。${ev('open')} 这一版是否使用台仓未核实，沙盘只在结尾剖面里展示它。</p>` },
          { title: '没有放进剧情的设备／Not shown as this production', html: `<p>转台、表演区升降台和载人飞行装置在许多镜框式剧场里都有，但本课没有取得这一版使用它们的证据，所以不编入剧情。</p><p>${ev('fact')} 结尾 Clara 与王子乘驯鹿雪橇飞离，这是有记录的可见效果；${ev('open')} 它的吊挂、驱动和载人方式未核实，沙盘只表现观众看到的结果。${ref('P5')}</p>` },
          { title: '关键尺寸／Key dimensions', html: `${table(['参数', 'McCaw Hall'], [['乐池升降台（靠舞台）', '9′1″ 深 × 67′ 宽'], ['乐池升降台（靠观众）', '6′10″ 深 × 70′7″ 宽'], ['乐池容量', '最多 90 名乐手'], ['乐池与观众之间的矮墙', '3′6″ 高，有两扇门'], ['活动台板区', '42′10″ × 25′10″，两层台仓'], ['台面材料与荷载', '染黑封漆枫木；250 磅／平方英尺']])}<p>${ev('venue')} ${ref('P6')}</p>` },
        ],
        model: '台仓、两层楼板、乐池升降台与布景升降机按场所资料的“有什么”来画；尺寸、位置与运行方式为示意。演奏员人数少于真实乐团。',
        sources: ['P6', 'Q2', 'P5'],
      },
    },
  };
})();
