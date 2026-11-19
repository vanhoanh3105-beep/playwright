// Evidence review only. The observed chat text is not a trusted business object.
const present = (text, re) => re.test(text);
const nonnegativeInt = x => Number.isInteger(x) && x >= 0;
const countKeys = ['goals','agents','proposals','planRefs','sessions'];
export function reviewGoal001(probe, answerFile) {
  const p = probe || {};
  const s = p.sse || {};
  const answer = typeof answerFile === 'string' ? answerFile.replace(/\r?\n$/, '') : '';
  const paired = nonnegativeInt(s.contentLength) && s.contentLength > 0 && answer.length === s.contentLength;
  const transport = p.mode === 'send-one' && p.status === 'PASS_TRANSPORT' && p.readStatus === 'PASS_READ' &&
    p.http === 200 && p.contentType === 'text/event-stream' && p.transportStatus === 'DONE_RECEIVED' &&
    s.done === true && s.role === 'assistant' && s.sessionIdPresent === true && s.turnIdPresent === true &&
    s.messageIdPresent === true && p.sessionPersisted === true;
  const applicable = transport && paired;
  const patterns = [
    ['lead', /(?:\blead\b|khách hàng tiềm năng)/iu, 'Có nhắc đến lead/mục tiêu'],
    ['context', /(?:bối cảnh|hiện trạng|trạng thái hiện tại|điểm nghẽn)/iu, 'Có đề cập bối cảnh'],
    ['workflow', /(?:quy trình|workflow|thu thập.*phân loại|định tuyến)/iu, 'Có đề cập quy trình'],
    ['agents', /(?:nhân sự AI|vai trò|\bagent\b)/iu, 'Có đề cập Agent'],
    ['kpi', /(?:\bKPI\b|chỉ tiêu|tỷ lệ chuyển đổi)/iu, 'Có đề cập KPI'],
    ['risk', /(?:rủi ro|giảm thiểu|đánh đổi)/iu, 'Có đề cập rủi ro'],
    ['milestone', /(?:milestone|mốc|triển khai|\btuần\b)/iu, 'Có đề cập triển khai']
  ];
  const checks = patterns.map(([id,re,label]) => ({id,label,status:applicable?(present(answer,re)?'SIGNAL_FOUND':'NOT_FOUND'):'NOT_CHECKED'}));
  const truncated = applicable && /(?:câu trả lời bị cắt|gõ ["“']?tiếp["”']? để nhận phần còn|response (?:was )?truncated)/iu.test(answer);
  const enums = s.metaEnums || {};
  const toolEvents = Array.isArray(s.events) && s.events.some(e=>['tool_start','tools'].includes(e));
  const countsAvailable = countKeys.every(k=>nonnegativeInt(p.before?.[k])&&nonnegativeInt(p.after?.[k])&&nonnegativeInt(p.newCounts?.[k]));
  const issues=[];
  if(!transport) issues.push('Không có bằng chứng probe gửi thành công trong lần chạy này.');
  if(!paired) issues.push('Thiếu file phản hồi hoặc độ dài không khớp contentLength của probe; không đánh giá nội dung.');
  if(truncated) issues.push('Phản hồi có thông báo bị cắt; cần xem xét giới hạn độ dài.');
  if(enums.result_kind==='unverified') issues.push('Backend báo result_kind=unverified.');
  if(toolEvents) issues.push('Có sự kiện gọi công cụ; chưa đối chiếu policy/audit thực thi.');
  if(countsAvailable && p.newCounts.goals===0 && p.newCounts.planRefs===0) issues.push('Không phát hiện ID Goal hoặc tham chiếu Plan mới; không đủ để kết luận lỗi, vì phân tích văn bản cũng có thể đáp ứng GO-001.');
  issues.push('Chưa xác minh capability workforce.inspect/workforce.plan, kết quả phân tích hợp lệ và bước mở kết quả; không dùng keyword hoặc HTTP 200 để kết luận PASS nghiệp vụ.');
  return {caseId:'WF-GO-001', status:transport?'NEEDS_REVIEW':'NOT_RUN', transport:transport?'PASS_TRANSPORT':'NOT_VERIFIED', answerLengthMatches:paired, checks, truncated, backendResultKind:enums.result_kind==='unverified'?'unverified':'not-confirmed', modeAuto:enums.run_mode==='auto', toolEvents:!!toolEvents, issues, signalCount:checks.filter(x=>x.status==='SIGNAL_FOUND').length, newCounts:countsAvailable?Object.fromEntries(countKeys.map(k=>[k,p.newCounts[k]])):null};
}
