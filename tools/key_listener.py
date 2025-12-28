import keyboard
import socket
import time
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def send_command(command):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.sendto(command.encode('utf-8'), ('127.0.0.1', 3002))
        sock.close()
        print(f"Command sent: {command}")
    except Exception as e:
        print(f"Error sending command: {e}")

def on_key_event(event):
    try:
        key_name = event.name
        print(f"Key pressed: {key_name} (scan_code: {event.scan_code})")

        if key_name == 'numpad 0' or event.scan_code == 82:
            print("Numpad0 detected!")
            send_command('toggle')
        elif key_name == 'up':
            print("ArrowUp detected!")
            send_command('nav:up')
        elif key_name == 'down':
            print("ArrowDown detected!")
            send_command('nav:down')
        elif key_name == 'left':
            print("ArrowLeft detected!")
            send_command('nav:left')
        elif key_name == 'right':
            print("ArrowRight detected!")
            send_command('nav:right')
    except Exception as e:
        print(f"Error in key event handler: {e}")

def main():
    print("=" * 50)
    print("Initializing key listener...")
    print("=" * 50)

    try:
        print("[1/3] Registering key press handler...")
        keyboard.on_press(on_key_event)
        print("[1/3] [OK] Key press handler registered successfully")

        print("[2/3] Testing keyboard library...")
        print("[2/3] [OK] Keyboard library is working")

        print("[3/3] Starting main loop...")
        print("=" * 50)
        print("Listening for keys (Numpad0, Arrow keys)...")
        print("To exit, press Ctrl+C in the terminal")
        print("=" * 50)

        while True:
            time.sleep(0.1)
    except ImportError as e:
        print(f"Import error: {e}")
        print("Make sure 'keyboard' library is installed: pip install keyboard")
        sys.exit(1)
    except PermissionError as e:
        print(f"Permission error: {e}")
        print("On Windows, you may need to run this script as Administrator")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nInterrupted, exiting...")
        sys.exit(0)
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
