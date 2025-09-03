// 标准工作时间（10小时）
const STANDARD_WORK_HOURS = 10;

// 打卡记录管理类
class WorkTimeTracker {
    constructor() {
        this.records = this.loadRecords();
        this.todayRecord = this.getTodayRecord();
        this.initElements();
        this.initEventListeners();
        this.updateDisplay();
        this.startClock();
    }

    initElements() {
        this.currentTimeElement = document.getElementById('current-time');
        this.startTimeElement = document.getElementById('start-time');
        this.endTimeElement = document.getElementById('end-time');
        this.workDurationElement = document.getElementById('work-duration');
        this.overtimeElement = document.getElementById('overtime');
        this.monthlyOvertimeElement = document.getElementById('monthly-overtime');
        this.clockInButton = document.getElementById('clock-in');
        this.clockOutButton = document.getElementById('clock-out');
        this.viewRecordsButton = document.getElementById('view-records');
        this.importHistoryButton = document.getElementById('import-history');
        this.exportButton = document.getElementById('export-records');
        this.recordsElement = document.getElementById('records');
        this.recordsTableBody = document.querySelector('#records-table tbody');
        
        // 历史数据导入模态框元素
        this.importModal = document.getElementById('import-modal');
        this.historyDateInput = document.getElementById('history-date');
        this.historyStartTimeInput = document.getElementById('history-start-time');
        this.historyEndTimeInput = document.getElementById('history-end-time');
        this.saveHistoryButton = document.getElementById('save-history');
        this.cancelImportButton = document.getElementById('cancel-import');
    }

    initEventListeners() {
        this.clockInButton.addEventListener('click', () => this.clockIn());
        this.clockOutButton.addEventListener('click', () => this.clockOut());
        this.viewRecordsButton.addEventListener('click', () => this.toggleRecords());
        this.importHistoryButton.addEventListener('click', () => this.showImportModal());
        this.importBackupButton = document.getElementById('import-backup');
        this.importBackupButton.addEventListener('click', () => this.handleBackupImport());
        this.exportButton.addEventListener('click', () => this.exportRecords());
        this.saveHistoryButton.addEventListener('click', () => this.saveHistoryData());
        this.cancelImportButton.addEventListener('click', () => this.hideImportModal());
        
        // 添加上传文件处理
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => this.handleFileImport(e));
        document.body.appendChild(fileInput);
        this.fileInput = fileInput;

        // 添加备份文件处理
        const backupInput = document.createElement('input');
        backupInput.type = 'file';
        backupInput.accept = '.json';
        backupInput.style.display = 'none';
        backupInput.addEventListener('change', (e) => this.handleBackupFile(e));
        document.body.appendChild(backupInput);
        this.backupInput = backupInput;
        
        // 点击模态框外部关闭
        this.importModal.addEventListener('click', (e) => {
            if (e.target === this.importModal) {
                this.hideImportModal();
            }
        });
    }

    startClock() {
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
    }

    updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN');
        this.currentTimeElement.textContent = `当前时间: ${timeString}`;
    }

    clockIn() {
        const now = new Date();
        
        // 如果今天已经打过上班卡，不允许重复打卡
        if (this.todayRecord && this.todayRecord.startTime) {
            this.showMessage('今天已经打过上班卡了！');
            return;
        }

        // 创建或更新今天的记录
        if (!this.todayRecord) {
            this.todayRecord = {
                date: this.formatDate(now),
                startTime: now,
                endTime: null,
                workDuration: 0,
                overtime: 0
            };
        } else {
            this.todayRecord.startTime = now;
        }

        this.saveTodayRecord();
        this.updateDisplay();
        this.showMessage('上班打卡成功！');
    }
    clockOut() {
        const now = new Date();
        
        // 检查是否已经打过上班卡
        if (!this.todayRecord || !this.todayRecord.startTime) {
            this.showMessage('请先打上班卡！');
            return;
        }

        // 如果今天已经打过下班卡，不允许重复打卡
        if (this.todayRecord.endTime) {
            this.showMessage('今天已经打过下班卡了！');
            return;
        }

        // 确保日期字段存在
        if (!this.todayRecord.date) {
            this.todayRecord.date = this.formatDate(now);
        }

        // 更新下班时间
        this.todayRecord.endTime = now;
        
        // 计算工时和加班时长（精确到毫秒）
        const durationMs = now - this.todayRecord.startTime;
        const workDuration = durationMs / (1000 * 60 * 60); // 转换为小时
        this.todayRecord.workDuration = workDuration;
        
        // 计算加班时长（工时 - 10小时）
        const overtimeHours = workDuration - STANDARD_WORK_HOURS;
        this.todayRecord.overtime = overtimeHours;

        console.log('下班打卡数据:', {
            date: this.todayRecord.date,
            startTime: this.todayRecord.startTime,
            endTime: this.todayRecord.endTime,
            workDuration: workDuration,
            overtime: overtimeHours
        });

        // 保存并更新显示
        this.saveTodayRecord();
        this.updateDisplay();
        
        // 显示加班信息
        const overtimeText = this.formatDuration(overtimeHours);
        const overtimeMessage = overtimeHours >= 0 
            ? `下班打卡成功！今日加班时长：${overtimeText}`
            : `下班打卡成功！今日少工作时长：${this.formatDuration(Math.abs(overtimeHours))}`;
        
        this.showMessage(overtimeMessage);
    }

    calculateDuration(startTime, endTime) {
        const durationMs = endTime - startTime;
        const durationHours = durationMs / (1000 * 60 * 60);
        return durationHours;
    }

    formatDuration(hours) {
        const h = Math.floor(Math.abs(hours));
        const m = Math.floor((Math.abs(hours) * 60) % 60);
        const s = Math.floor((Math.abs(hours) * 3600) % 60);
        
        const sign = hours < 0 ? '-' : '';
        return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    formatDate(date) {
        return date.toLocaleDateString('zh-CN');
    }

    formatTime(date) {
        return date.toLocaleTimeString('zh-CN');
    }

    updateDisplay() {
        console.log('更新显示，今日记录:', this.todayRecord);
        // 更新今日信息
        if (this.todayRecord) {
            if (this.todayRecord.startTime) {
                const startTimeStr = this.formatTime(this.todayRecord.startTime);
                console.log('上班时间:', startTimeStr);
                this.startTimeElement.textContent = startTimeStr;
            } else {
                this.startTimeElement.textContent = '--:--:--';
            }
            
            if (this.todayRecord.endTime) {
                const endTimeStr = this.formatTime(this.todayRecord.endTime);
                const workDurationStr = this.formatDuration(this.todayRecord.workDuration);
                const overtimeStr = this.formatDuration(this.todayRecord.overtime);
                
                console.log('下班时间:', endTimeStr);
                console.log('工时:', workDurationStr);
                console.log('加班时长:', overtimeStr);
                
                this.endTimeElement.textContent = endTimeStr;
                this.workDurationElement.textContent = workDurationStr;
                this.overtimeElement.textContent = overtimeStr;
                
                // 设置加班时长的颜色
                this.overtimeElement.className = this.todayRecord.overtime >= 0 
                    ? 'positive-overtime' 
                    : 'negative-overtime';
            } else {
                this.endTimeElement.textContent = '--:--:--';
                this.workDurationElement.textContent = '--:--:--';
                this.overtimeElement.textContent = '--:--:--';
                this.overtimeElement.className = 'neutral-overtime';
            }
        } else {
            this.startTimeElement.textContent = '--:--:--';
            this.endTimeElement.textContent = '--:--:--';
            this.workDurationElement.textContent = '--:--:--';
            this.overtimeElement.textContent = '--:--:--';
            this.overtimeElement.className = 'neutral-overtime';
        }

        // 更新本月累计加班
        const monthlyOvertime = this.calculateMonthlyOvertime();
        this.monthlyOvertimeElement.textContent = this.formatDuration(monthlyOvertime);
        this.monthlyOvertimeElement.className = monthlyOvertime >= 0 
            ? 'positive-overtime' 
            : 'negative-overtime';

        // 更新打卡记录表格
        this.updateRecordsTable();
    }

    calculateMonthlyOvertime() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        return this.records
            .filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getMonth() === currentMonth && 
                       recordDate.getFullYear() === currentYear &&
                       record.overtime !== undefined;
            })
            .reduce((total, record) => total + record.overtime, 0);
    }

    updateRecordsTable() {
        this.recordsTableBody.innerHTML = '';
        
        // 按日期倒序排列
        const sortedRecords = [...this.records].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        sortedRecords.forEach(record => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = record.date;
            
            const startTimeCell = document.createElement('td');
            startTimeCell.textContent = record.startTime ? this.formatTime(new Date(record.startTime)) : '--:--:--';
            
            const endTimeCell = document.createElement('td');
            endTimeCell.textContent = record.endTime ? this.formatTime(new Date(record.endTime)) : '--:--:--';
            
            const workDurationCell = document.createElement('td');
            workDurationCell.textContent = record.workDuration !== undefined ? 
                this.formatDuration(record.workDuration) : '--:--:--';
            
            const overtimeCell = document.createElement('td');
            if (record.overtime !== undefined) {
                overtimeCell.textContent = this.formatDuration(record.overtime);
                overtimeCell.className = record.overtime >= 0 ? 'positive-overtime' : 'negative-overtime';
            } else {
                overtimeCell.textContent = '--:--:--';
            }
            
            row.appendChild(dateCell);
            row.appendChild(startTimeCell);
            row.appendChild(endTimeCell);
            row.appendChild(workDurationCell);
            row.appendChild(overtimeCell);
            
            this.recordsTableBody.appendChild(row);
        });
    }

    toggleRecords() {
        if (this.recordsElement.style.display === 'none' || !this.recordsElement.style.display) {
            this.recordsElement.style.display = 'block';
            this.viewRecordsButton.textContent = '隐藏打卡记录';
        } else {
            this.recordsElement.style.display = 'none';
            this.viewRecordsButton.textContent = '查看打卡记录';
        }
    }

    showImportModal() {
        // 设置默认日期为今天
        const today = new Date();
        this.historyDateInput.value = today.toISOString().split('T')[0];
        
        // 清空时间输入
        this.historyStartTimeInput.value = '';
        this.historyEndTimeInput.value = '';
        
        // 显示模态框
        this.importModal.style.display = 'flex';
    }

    hideImportModal() {
        this.importModal.style.display = 'none';
    }

    saveHistoryData() {
        const date = this.historyDateInput.value;
        const startTime = this.historyStartTimeInput.value;
        const endTime = this.historyEndTimeInput.value;

        // 验证输入
        if (!date || !startTime) {
            this.showMessage('请至少填写日期和上班时间！');
            return;
        }

        // 创建日期时间对象
        const startDateTime = new Date(`${date}T${startTime}`);
        
        // 检查是否已存在该日期的记录
        const existingRecordIndex = this.records.findIndex(
            record => record.date === new Date(date).toLocaleDateString('zh-CN')
        );

        // 创建记录对象
        const historyRecord = {
            date: new Date(date).toLocaleDateString('zh-CN'),
            startTime: startDateTime,
            endTime: null,
            workDuration: 0,
            overtime: 0
        };

        // 如果提供了下班时间
        if (endTime) {
            const endDateTime = new Date(`${date}T${endTime}`);
            
            // 验证时间逻辑
            if (endDateTime <= startDateTime) {
                this.showMessage('下班时间必须晚于上班时间！');
                return;
            }

            // 计算工时和加班时长
            const workDuration = this.calculateDuration(startDateTime, endDateTime);
            const overtimeHours = workDuration - STANDARD_WORK_HOURS;

            historyRecord.endTime = endDateTime;
            historyRecord.workDuration = workDuration;
            historyRecord.overtime = overtimeHours;
        }

        // 保存记录
        if (existingRecordIndex !== -1) {
            // 更新现有记录
            this.records[existingRecordIndex] = historyRecord;
            this.showMessage('历史数据更新成功！');
        } else {
            // 添加新记录
            this.records.push(historyRecord);
            this.showMessage('历史数据添加成功！');
        }

        // 保存到本地存储
        this.saveRecords();

        // 更新显示
        this.updateDisplay();

        // 关闭模态框
        this.hideImportModal();
    }

    handleBackupImport() {
        this.backupInput.click();
    }

    handleBackupFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.records = data.map(record => ({
                    ...record,
                    startTime: record.startTime ? new Date(record.startTime) : null,
                    endTime: record.endTime ? new Date(record.endTime) : null
                }));
                this.saveRecords();
                this.updateDisplay();
                this.showMessage('备份数据已完全覆盖当前数据');
            } catch (error) {
                this.showMessage('导入备份失败: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // 仅添加新记录，不覆盖现有数据
                const newRecords = data.map(record => ({
                    ...record,
                    startTime: record.startTime ? new Date(record.startTime) : null,
                    endTime: record.endTime ? new Date(record.endTime) : null
                }));
                
                // 合并记录，保留唯一日期
                newRecords.forEach(newRecord => {
                    const existingIndex = this.records.findIndex(
                        r => r.date === newRecord.date
                    );
                    if (existingIndex !== -1) {
                        this.records[existingIndex] = newRecord;
                    } else {
                        this.records.push(newRecord);
                    }
                });
                
                this.saveRecords();
                this.updateDisplay();
                this.showMessage('历史数据导入成功');
            } catch (error) {
                this.showMessage('导入失败: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    exportRecords() {
        const data = JSON.stringify(this.records, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `work-time-records_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    showMessage(message) {
        // 创建消息提示元素
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            font-size: 16px;
            max-width: 80%;
            text-align: center;
        `;
        messageElement.textContent = message;
        
        document.body.appendChild(messageElement);
        
        // 3秒后自动消失
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 3000);
    }

    // 本地存储相关方法
    loadRecords() {
        const stored = localStorage.getItem('workTimeRecords');
        if (stored) {
            try {
                const records = JSON.parse(stored);
                // 转换字符串日期为Date对象
                return records.map(record => ({
                    ...record,
                    startTime: record.startTime ? new Date(record.startTime) : null,
                    endTime: record.endTime ? new Date(record.endTime) : null
                }));
            } catch (e) {
                console.error('Failed to parse records:', e);
                return [];
            }
        }
        return [];
    }

    saveRecords() {
        // 转换Date对象为字符串
        const recordsToSave = this.records.map(record => ({
            ...record,
            startTime: record.startTime ? record.startTime.toISOString() : null,
            endTime: record.endTime ? record.endTime.toISOString() : null
        }));
        localStorage.setItem('workTimeRecords', JSON.stringify(recordsToSave));
    }

    getTodayRecord() {
        const today = this.formatDate(new Date());
        return this.records.find(record => record.date === today);
    }

    saveTodayRecord() {
        if (this.todayRecord) {
            // 确保有日期字段
            if (!this.todayRecord.date) {
                this.todayRecord.date = this.formatDate(new Date());
            }
            
            const existingIndex = this.records.findIndex(
                record => record.date === this.todayRecord.date
            );
            
            if (existingIndex !== -1) {
                this.records[existingIndex] = this.todayRecord;
            } else {
                this.records.push(this.todayRecord);
            }
            
            console.log('保存今日记录:', this.todayRecord);
            this.saveRecords();
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new WorkTimeTracker();
});