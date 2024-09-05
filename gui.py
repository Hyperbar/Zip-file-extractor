import FreeSimpleGUI as sg
from zip_extractor import extract_archive

# Set the color theme for the GUI
sg.theme("Black")

# Create elements for selecting the archive file
label1 = sg.Text("Select archive")
input1 = sg.Input(tooltip="Select archive")
choose_button1 = sg.FileBrowse("Choose", key="archive")

# Create elements for selecting the destination directory
label2 = sg.Text("Select dest dir")
input2 = sg.Input(tooltip="Select destination directory", key="folder")
choose_button2 = sg.FolderBrowse("Choose", key="folder")

# Create an extract button and an output label
extract_button = sg.Button("Extract")
output_label = sg.Text("", key="output", text_color="green")

# Create the main window with a title and layout
window = sg.Window("Archive Extractor - Hyperbar",
                   layout=[
                       [label1, input1, choose_button1],
                       [label2, input2, choose_button2],
                       [extract_button, output_label]
                   ])

# Main event loop
while True:
    event, values = window.read()

    # Exit the loop if the window is closed
    if event == sg.WINDOW_CLOSED:
        break

    # Handle the extract button click
    if event == "Extract":
        archivepath = values["archive"]
        dest_dir = values["folder"]

        # Check if both archive and destination are selected
        if archivepath and dest_dir:
            try:
                extract_archive(archivepath, dest_dir)
                window["output"].update(value="Extraction completed", text_color="green")
            except Exception as e:
                window["output"].update(value=f"Error: {str(e)}", text_color="red")
        else:
            window["output"].update(value="Please select both archive and destination", text_color="red")

    # Print the event and values for debugging
    print(event, values)

# Close the window when the loop ends
window.close()