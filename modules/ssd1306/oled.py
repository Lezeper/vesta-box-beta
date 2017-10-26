import Adafruit_SSD1306
import sys, json
from PIL import Image
from PIL import ImageDraw
from PIL import ImageFont

disp = Adafruit_SSD1306.SSD1306_128_64(rst=None)

def write_text(text1=None, text2=None, text3=None, font_size=None):

  disp.begin()

  disp.clear()
  disp.display()

  width = disp.width
  height = disp.height
  image = Image.new('1', (width, height))

  # Get drawing object to draw on image.
  draw = ImageDraw.Draw(image)

  # Draw a black filled box to clear the image.
  draw.rectangle((0,0,width,height), outline=0, fill=0)

  # Load default font.
  if not font_size: font_size = 20
  font = ImageFont.truetype("/home/pi/vesta/modules/ssd1306/FreeMono.ttf", font_size)

  if text1: draw.text((0, 0), text1,  font=font, fill=255)
  if text2: draw.text((0, 22), text2,  font=font, fill=255)
  if text3: draw.text((0, 42), text3,  font=font, fill=255)
  
  disp.image(image)
  disp.display()

def turn_on():
  disp.command(0xAF)

def turn_off():
  disp.command(0xAE)

for line in sys.stdin:
    data = json.loads(line)
    args = data['args']

    if data['command'] == 'write_text':
      if len(args) == 1:
        write_text(args[0])
      elif len(args) == 2:
        write_text(args[0], args[1])
      elif len(args) == 3:
        write_text(args[0], args[1], args[2])
      elif len(args) == 4:
        write_text(args[0], args[1], args[2], args[3])

    elif data['command'] == 'turn_off':
      turn_off()
    
    sys.stdout.flush()