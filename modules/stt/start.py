#!/usr/bin/env python

import signal
import collections
import pyaudio
import snowboydetect
import time
import os
import socket
import threading
import sys
import RPi.GPIO as GPIO

GPIO.setmode(GPIO.BCM)
GPIO.setup(12, GPIO.OUT)

TOP_DIR = os.path.dirname(os.path.abspath(__file__))

RESOURCE_FILE = os.path.join(TOP_DIR, "resources/common.res")
RATE = 16000
SERVER_RES_TIMEOUT = 10.0 # exit if server didn't response within 10s
GAIN = 2 # Gain only for snowboy

models = [os.path.join(TOP_DIR, "resources/alexa.umdl")]

class RingBuffer(object):
    """Ring buffer to hold audio from PortAudio"""
    def __init__(self, size=4096):
        self._buf = collections.deque(maxlen=size)

    def extend(self, data):
        """Adds data to the end of buffer"""
        self._buf.extend(data)

    def get(self):
        """Retrieves data from the beginning of buffer and clears it"""
        tmp = bytes(bytearray(self._buf))
        self._buf.clear()
        return tmp


class HotwordDetector(object):
    def __init__(self):
        threading.Thread(target=self.stdin).start()
        self.server_ip = sys.argv[1]
        self.box_id = sys.argv[2]

        decoder_model = models
        sensitivity = [0.5]
        tm = type(decoder_model)
        ts = type(sensitivity)
        if tm is not list:
            decoder_model = [decoder_model]
        if ts is not list:
            sensitivity = [sensitivity]
        model_str = ",".join(decoder_model)
        self.detector = snowboydetect.SnowboyDetect(
            resource_filename=RESOURCE_FILE.encode(), model_str=model_str.encode())
        self.detector.SetAudioGain(GAIN)
        self.num_hotwords = self.detector.NumHotwords()
        if len(decoder_model) > 1 and len(sensitivity) == 1:
            sensitivity = sensitivity*self.num_hotwords
        if len(sensitivity) != 0:
            assert self.num_hotwords == len(sensitivity), \
                "number of hotwords in decoder_model (%d) and sensitivity " \
                "(%d) does not match" % (self.num_hotwords, len(sensitivity))
        sensitivity_str = ",".join([str(t) for t in sensitivity])
        if len(sensitivity) != 0:
            self.detector.SetSensitivity(sensitivity_str.encode())
        
        self.hw_buffer = RingBuffer(self.detector.NumChannels() * RATE * 5)
        self.isStartStream = False
        self.connected = False
        self.isFocused = False
        self.audio = pyaudio.PyAudio()

        self.setup_conn()
    
    def stdin(self):
        line = ' '
        while line:
            line = sys.stdin.readline()
            # print line
            if(line == 'focus|true'+os.linesep):
                self.isFocused = True
            elif(line == 'focus|false'+os.linesep):
                self.isFocused = False
            elif(line == 'responsed'+os.linesep):
                self.isStartStream = False
    
    def setup_conn(self):
        self.connected = False
        self.client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.client_socket.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
        self.client_socket.setsockopt(socket.SOL_TCP, socket.TCP_KEEPIDLE, 1)
        self.client_socket.setsockopt(socket.SOL_TCP, socket.TCP_KEEPINTVL, 1)
        self.client_socket.setsockopt(socket.SOL_TCP, socket.TCP_KEEPCNT, 5)
        self.client_socket.settimeout(SERVER_RES_TIMEOUT)
        
        try:
            self.client_socket.connect((self.server_ip, 50007))
            print "connected"
            self.connected = True
            self.client_socket.send('BOXID|' + self.box_id + '|')
        except (socket.timeout, socket.error):
            'Server Down! try to reconnect...'
            time.sleep(5)
            self.setup_conn()
        except KeyboardInterrupt:
            self.client_socket.close()
    
    def cleanup(self):
        self.isStartStream = False
        GPIO.output(12, False)
        if self.stream_out is not None:
            self.stream_out.stop_stream()
            self.stream_out.close()

    def start(self, sleep_time=0.03):
        
        def audio_callback(in_data, frame_count, time_info, status):

            if self.isStartStream:
                try:
                    self.client_socket.send(in_data)
                except:
                    self.setup_conn()
            else:
                self.hw_buffer.extend(in_data)
            
            return None, pyaudio.paContinue
        
        self.stream_in = self.audio.open(
            input=True,
            format=pyaudio.paInt16,
            channels=1,
            rate=RATE,
            frames_per_buffer=1600,
            stream_callback=audio_callback)
        
        while self.connected:

            hw_buf_data = self.hw_buffer.get()
            if len(hw_buf_data) == 0:
                time.sleep(sleep_time)
                continue

            ans = self.detector.RunDetection(hw_buf_data)
            if ans == -1:
                print "Error initializing streams or reading audio data"
            elif ans > 0:

                # if not self.isFocused:
                #     print "Not Focused"
                #     continue
                GPIO.output(12, True)
                print "DETECT!"
                try:
                    self.client_socket.send('DETECT|' + str(ans) + '|')
                    self.isStartStream = True
                except Exception as e:
                    print(e)
                    self.cleanup()
                    continue

                self.stream_out = self.audio.open(
                    format=pyaudio.paInt16,
                    channels=1,
                    rate=RATE,
                    output=True)

                # waiting for the repsonse from server
                # t1 = time.time()
                # while self.isStartStream:
                #     time.sleep(sleep_time)

                #     if(time.time() - t1 > SERVER_RES_TIMEOUT):
                #         self.isStartStream = False
                #         print "No response from server"
                
                try:
                    out_data = self.client_socket.recv(1024)

                    while True:
                        self.stream_out.write(out_data)
                        out_data = self.client_socket.recv(1024)
                        if "AudioStream_END" in out_data:
                            time.sleep(0.2)
                            break
                except:
                    print('error 3')
                    pass
                print 'DONE'
                self.cleanup()

    def terminate(self):
        self.stream_in.stop_stream()
        self.stream_in.close()
        self.audio.terminate()
        GPIO.cleanup()

detector = HotwordDetector()

try:
    detector.start()
except KeyboardInterrupt:
    detector.connected = False
    detector.terminate()
