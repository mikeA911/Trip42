import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function CalendarModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const scrollContainerRef = useRef(null);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getMonthsToShow = () => {
    const months = [];
    for (let i = -1; i <= 1; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i);
      months.push(date);
    }
    return months;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerWidth = container.clientWidth;
      // Scroll to center the middle month
      container.scrollLeft = containerWidth;
    }
  }, [currentDate, isOpen]);

  const isToday = (date) => {
    const today = new Date();
    return date && 
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    return selectedDate && date &&
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const isCurrentMonth = (monthDate) => {
    return monthDate.getMonth() === currentDate.getMonth() &&
           monthDate.getFullYear() === currentDate.getFullYear();
  };

  const months = getMonthsToShow();

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:bg-blue-600 transition-colors"
      >
        Open Calendar
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-screen overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Select Date</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <h3 className="text-lg font-semibold text-gray-800">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="day-names grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div 
                ref={scrollContainerRef}
                className="overflow-x-scroll scrollbar-hide"
              >
                <div className="flex">
                  {months.map((monthDate, monthIdx) => {
                    const days = getDaysInMonth(monthDate);
                    const isCurrent = isCurrentMonth(monthDate);
                    
                    return (
                      <div 
                        key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
                        className="flex-shrink-0"
                        style={{ 
                          width: '100%',
                          opacity: isCurrent ? 1 : 0.5,
                          transition: 'opacity 0.3s'
                        }}
                      >
                        <div className="grid grid-cols-7 gap-1 px-1">
                          {days.map((date, idx) => (
                            <button
                              key={idx}
                              onClick={() => date && handleDateClick(date)}
                              disabled={!date}
                              className={`
                                aspect-square flex items-center justify-center rounded-lg text-sm transition-colors
                                ${!date ? 'invisible' : ''}
                                ${isToday(date) ? 'bg-blue-100 text-blue-600 font-semibold' : ''}
                                ${isSelected(date) ? 'bg-blue-500 text-white font-semibold' : ''}
                                ${date && !isToday(date) && !isSelected(date) ? 'hover:bg-gray-100 text-gray-800' : ''}
                              `}
                            >
                              {date ? date.getDate() : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedDate && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Selected Date:</p>
                  <p className="text-base font-semibold text-blue-600">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedDate) {
                      setIsOpen(false);
                    }
                  }}
                  disabled={!selectedDate}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}