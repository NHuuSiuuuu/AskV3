import React from 'react';
import { BookOpen, GraduationCap, FileCheck, HelpCircle } from 'lucide-react';

interface EmptyChatProps {
  onSelectPrompt: (promptText: string) => void;
}

/**
 * Giao diện khi chưa có tin nhắn trong cuộc trò chuyện (lấy cảm hứng từ phong cách Gemini)
 */
export const EmptyChat: React.FC<EmptyChatProps> = ({ onSelectPrompt }) => {
  const suggestions = [
    {
      icon: BookOpen,
      title: 'Quy chế đào tạo & học vụ',
      desc: 'Quy định về đăng ký học phần, tính điểm trung bình và điều kiện tốt nghiệp.',
      prompt: 'Quy định về điều kiện tốt nghiệp và xét học bổng gồm những gì?',
    },
    {
      icon: GraduationCap,
      title: 'Chuẩn đầu ra & Ngoại ngữ',
      desc: 'Thông tin về chứng chỉ tiếng Anh, tin học và các chuẩn đầu ra cần thiết.',
      prompt: 'Quy định chuẩn đầu ra ngoại ngữ và tin học đối với sinh viên như thế nào?',
    },
    {
      icon: FileCheck,
      title: 'Biểu mẫu & Thủ tục hành chính',
      desc: 'Hướng dẫn làm thủ tục xin cấp bảng điểm, giấy xác nhận sinh viên, hoãn thi.',
      prompt: 'Thủ tục xin hoãn thi và nộp đơn xin nghỉ học tạm thời cần những giấy tờ gì?',
    },
    {
      icon: HelpCircle,
      title: 'Học phí & Chính sách miễn giảm',
      desc: 'Thời hạn đóng học phí và các đối tượng được hỗ trợ học tập theo quy định.',
      prompt: 'Thời hạn đóng học phí và các trường hợp được miễn giảm học phí ra sao?',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 mt-5 sm:p-8 max-w-4xl mx-auto my-auto text-center">
      {/* Lời chào */}
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
        Xin chào, tôi là <span className="bg-gradient-to-r from-[#0F2A4D] to-[#1E3A6B] bg-clip-text text-transparent">H-Ask</span>
      </h1>
      <p className="text-base sm:text-lg text-slate-600 max-w-xl mb-10 leading-relaxed font-normal">
        Trợ lý AI tra cứu thông tin chính xác từ văn bản, quy chế và quy định của trường.
      </p>

      {/* Gợi ý câu hỏi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-4 bg-white hover:bg-[#F6F8FB] border border-[#CBD5E1]/90  rounded-xl transition-all duration-200 text-left shadow-xs hover:shadow-md flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#0F2A4D]/5  text-[#0F2A4D] flex items-center justify-center flex-shrink-0 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-800 group-hover:text-[#0F2A4D] text-sm transition-colors">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-normal line-clamp-2">
                {item.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
