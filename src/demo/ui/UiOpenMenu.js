/**
 * @fileOverview UiOpenMenu
 * @author Epam
 * @version 1.0.0
 */


// ********************************************************
// Imports
// ********************************************************


import React from 'react';
import { connect } from 'react-redux';
import { NavDropdown, Button, Modal, InputGroup, FormControl, } from 'react-bootstrap';

import Volume from '../engine/Volume';
import Texture3D from '../engine/Texture3D';

import UiModalDemo from './UiModalDemo';
import UiModalGoogle from './UiModalGoogle';
import StoreActionType from '../store/ActionTypes';
import ModeView from '../store/ModeView';
import Modes3d from '../store/Modes3d';

// import { timingSafeEqual } from 'crypto';
import LoadResult from '../engine/LoadResult';
import FileTools from '../engine/loaders/FileTools';
import LoaderDicom from '../engine/loaders/LoaderDicom';
import LoaderHdr from '../engine/loaders/LoaderHdr';

import LoaderUrlDicom from '../engine/loaders/LoaderUrlDicom';

import config from '../config/config';

// ********************************************************
// Const
// ********************************************************

/** deep artificially fix volume texture size to 4 * N */
const NEED_TEXTURE_SIZE_4X = true;

// ********************************************************
// Class
// ********************************************************


/**
 * Class UiOpenMenu some text later...
 */
class UiOpenMenu extends React.Component {
  /**
   * @param {object} props - props from up level object
   */
  constructor(props) {
    super(props);
    this.onButtonLocalFile = this.onButtonLocalFile.bind(this);
    this.handleFileSelected = this.handleFileSelected.bind(this);
    this.onFileContentReadSingleFile = this.onFileContentReadSingleFile.bind(this);
    this.onFileContentReadMultipleDicom = this.onFileContentReadMultipleDicom.bind(this);
    this.onFileContentReadMultipleHdr = this.onFileContentReadMultipleHdr.bind(this);
    this.setErrorString = this.setErrorString.bind(this);

    this.onModalUrlShow = this.onModalUrlShow.bind(this);
    this.onModalUrlHide = this.onModalUrlHide.bind(this);
    this.onClickLoadUrl = this.onClickLoadUrl.bind(this);
    this.callbackReadCompleteUrlKtxNii = this.callbackReadCompleteUrlKtxNii.bind(this);

    this.onModalDemoOpenShow = this.onModalDemoOpenShow.bind(this);
    this.onModalDemoOpenHide = this.onModalDemoOpenHide.bind(this);
    this.onDemoSelected = this.onDemoSelected.bind(this);

    this.onModalGoogleShow = this.onModalGoogleShow.bind(this);
    this.onModalGoogleHide = this.onModalGoogleHide.bind(this);
    this.onGoogleSelected = this.onGoogleSelected.bind(this);

    this.callbackReadProgress = this.callbackReadProgress.bind(this);
    this.callbackReadComplete = this.callbackReadComplete.bind(this);
    this.callbackReadSingleDicomComplete = this.callbackReadSingleDicomComplete.bind(this);
    this.callbackReadMultipleComplete = this.callbackReadMultipleComplete.bind(this);

    this.m_fileName = '';
    this.m_fileReader = null;
    this.state = {
      strUrl: '',
      showModalUrl: false,
      showModalDemo: false,
      showModalGoogle: false,
    };
    this.m_volume = null;
    this.m_volumeRoi = null;
    this.m_updateEnable = true;
    this.roiMode = false;
  }
  finalizeSuccessLoadedVolume(vol, fileNameIn) {
    if (vol.m_dataArray !== null) {
      console.log(`success loaded volume from ${fileNameIn}`);
      if (NEED_TEXTURE_SIZE_4X) {
        vol.makeDimensions4x();
      }
      // invoke notification
      const store = this.props;
      store.dispatch({ type: StoreActionType.SET_VOLUME, volume: vol });
      store.dispatch({ type: StoreActionType.SET_IS_LOADED, isLoaded: true });
      store.dispatch({ type: StoreActionType.SET_FILENAME, fileName: fileNameIn });
      store.dispatch({ type: StoreActionType.SET_ERR_ARRAY, arrErrors: [] });
      const tex3d = new Texture3D();
      tex3d.createFromRawVolume(vol);
      store.dispatch({ type: StoreActionType.SET_TEXTURE3D, texture3d: tex3d });
      store.dispatch({ type: StoreActionType.SET_MODE_VIEW, modeView: ModeView.VIEW_2D });
      store.dispatch({ type: StoreActionType.SET_MODE_3D, mode3d: Modes3d.RAYCAST });
    }
  }
  setErrorString(strErr) {
    const store = this.props;
    const arrErrors = [];
    arrErrors.push(strErr);
    store.dispatch({ type: StoreActionType.SET_IS_LOADED, isLoaded: false });
    store.dispatch({ type: StoreActionType.SET_ERR_ARRAY, arrErrors: arrErrors });
    store.dispatch({ type: StoreActionType.SET_VOLUME, volume: null });
  }
  finalizeFailedLoadedVolume(vol, fileNameIn, arrErrors) {
    // invoke notification
    const store = this.props;
    store.dispatch({ type: StoreActionType.SET_IS_LOADED, isLoaded: false });
    store.dispatch({ type: StoreActionType.SET_VOLUME, volume: null });
    store.dispatch({ type: StoreActionType.SET_ERR_ARRAY, arrErrors: arrErrors });
    store.dispatch({ type: StoreActionType.SET_FILENAME, fileName: fileNameIn });

    const uiapp = store.uiApp;
    uiapp.doHideProgressBar();
  }
  callbackReadProgress(ratio01) {
    // console.log(`callbackReadProgress = ${ratio01}`);
    const ratioPrc = Math.floor(ratio01 * 100);
    const store = this.props;
    const uiapp = store.uiApp;
    if (ratioPrc === 0) {
      uiapp.doShowProgressBar('Loading...');
    }
    if (ratioPrc >= 99) {
      // console.log(`callbackReadProgress. hide on = ${ratio01}`);
      uiapp.doHideProgressBar();
    } else {
      uiapp.doSetProgressBarRatio(ratioPrc);
    }
  } // callback progress
  callbackReadComplete(errCode) {
    if (errCode === undefined) {
      console.log('callbackReadComplete. should be errCode');
    } else {
      if (errCode !== LoadResult.SUCCESS) {
        const strErr = LoadResult.getResultString(errCode);
        this.setErrorString(strErr);
      }
    }
    const store = this.props;
    const uiapp = store.uiApp;
    // console.log(`callbackReadComplete wiyth err = ${loadErrorCode}`);
    uiapp.doHideProgressBar();

    if (errCode === LoadResult.SUCCESS) {
      // console.log('callbackReadComplete finished OK');
      this.finalizeSuccessLoadedVolume(this.m_volume, this.m_fileName);
    } else {
      console.log(`callbackReadComplete failed! reading ${this.m_fileName} file`);
      const arrErr = [];
      const strErr = LoadResult.getResultString(errCode);
      arrErr.push(strErr);
      this.finalizeFailedLoadedVolume(this.m_volume, this.m_fileName, arrErr);
    }
  }
  callbackReadSingleDicomComplete(errCode) {
    if (errCode === LoadResult.SUCCESS) {
      this.m_loaderDicom.createVolumeFromSlices(this.m_volume);
    }
    this.callbackReadComplete(errCode);
  }
  callbackReadMultipleComplete(errCode) {
    if (errCode !== LoadResult.SUCCESS) {
      const strErr = LoadResult.getResultString(errCode);
      this.setErrorString(strErr);
    }
  }
  //
  // based on local file read
  // read from string content in this.m_fileReader.result
  //
  onFileContentReadSingleFile() {
    console.log('UiOpenMenu. onFileContentReadSingleFile ...');
    const strContent = this.m_fileReader.result;
    // console.log(`file content = ${strContent.substring(0, 64)}`);
    // console.log(`onFileContentRead. type = ${typeof strContent}`);
    this.m_volume = new Volume();
    const callbackProgress = this.callbackReadProgress;
    const callbackComplete = this.callbackReadComplete;
    const callbackCompleteSingleDicom = this.callbackReadSingleDicomComplete;

    if (this.m_fileName.endsWith('.ktx') || this.m_fileName.endsWith('.KTX')) {
      // if read ktx
      this.m_volume.readFromKtx(strContent, callbackProgress, callbackComplete);
    } else if (this.m_fileName.endsWith('.nii') || this.m_fileName.endsWith('.NII')) {
      this.m_volume.readFromNifti(strContent, callbackProgress, callbackComplete);
    } else if (this.m_fileName.endsWith('.dcm') || this.m_fileName.endsWith('.DCM')) {
      this.m_loaderDicom = new LoaderDicom();
      this.m_loaderDicom.m_zDim = 1;
      this.m_loaderDicom.m_numFiles = 1;
      this.m_volume.readFromDicom(this.m_loaderDicom, strContent, callbackProgress, callbackCompleteSingleDicom);
    } else if (this.m_fileName.endsWith('.hdr') || this.m_fileName.endsWith('.HDR')) {
      // readOk = vol.readFromHdrHeader(strContent, callbackProgress, callbackComplete);
      console.log(`cant read single hdr file: ${this.m_fileName}`);
      // readStatus = LoadResult.BAD_HEADER;
    } else if (this.m_fileName.endsWith('.img') || this.m_fileName.endsWith('.IMG')) {
      // readOk = vol.readFromHdrImage(strContent, callbackProgress, callbackComplete);
      console.log(`cant read single img file: ${this.m_fileName}`);
      // readStatus = LoadResult.BAD_HEADER;
    } else {
      console.log(`onFileContentReadSingleFile: unknown file type: ${this.m_fileName}`);
    }
    /*
    if (readStatus === LoadResult.SUCCESS) {
      console.log('onFileContentRead finished OK');
      this.finalizeSuccessLoadedVolume(vol, this.m_fileName);
    } else {
      console.log(`onFileContentRead failed! reading ${this.m_fileName} file`);
      const arrErr = [];
      const strErr = LoadResult.getResultString(readStatus);
      arrErr.push(strErr);
      this.finalizeFailedLoadedVolume(vol, this.m_fileName, arrErr);
    }
    */
  }
  //
  // read hdr/img. content is in this.m_fileReader.result
  //
  onFileContentReadMultipleHdr() {
    const VALID_NUM_FILES_2 = 2;
    const VALID_NUM_FILES_4 = 4;
    if ((this.m_numFiles !== VALID_NUM_FILES_2) && (this.m_numFiles !== VALID_NUM_FILES_4)) {
      console.log(`onFileContentReadMultipleHdr: can read ${VALID_NUM_FILES_2} or ${VALID_NUM_FILES_4} files for multiple hdr loader`);  
      return;
    }

    const isHdr = this.m_fileName.endsWith('hdr') || this.m_fileName.endsWith('HDR');
    console.log(`onFileContentReadMultipleHdr: read file ${this.m_fileName}. Ratio=${this.m_fileIndex} / ${this.m_numFiles}`);
    this.m_fileIndex++;
    const ratioLoad = this.m_fileIndex / this.m_numFiles;
    const strContent = this.m_fileReader.result;
    // const lenContent = strContent.length;

    if (this.m_fileIndex <= 1) {
      this.callbackReadProgress(0.0);
    }

    if ((this.m_numFiles === VALID_NUM_FILES_4) && (this.m_volumeRoi === null)) {
      this.m_volumeRoi = new Volume();
    }

    const callbackProgress = null;
    const callbackComplete = null;

    const regExpFileName = /([\S]+)\.[\S]+/;
    const fnameArr = regExpFileName.exec(this.m_fileName);
    const numFN = fnameArr.length;
    // console.log(`!!!!!!!!!!!!!!!!!!! FILE NAME = ${fnameArr[1]}, NUMFN = ${numFN}`);
    let detectedMask  = false;
    let detectedIntensity = false;
    if (numFN === 2) {
      const fname = fnameArr[1];
      if (fname.endsWith('_mask')) {
        detectedMask = true;
      }
      if (fname.endsWith('_intn')) {
        detectedIntensity = true;
      }
    }
    let volDst = (this.m_fileIndex <= VALID_NUM_FILES_2) ? this.m_volume : this.m_volumeRoi;
    if (detectedIntensity) {
      volDst = this.m_volume;
      // console.log('intensity vol by name');
    }
    if (detectedMask) {
      volDst = this.m_volumeRoi;
      this.roiMode = true;
      // console.log('mask vol by name');
      if (this.m_numFiles !== VALID_NUM_FILES_4) {
        console.log('You need to load 4 files, if one of them has _mask in name');
        return;
      }
    }


    let readOk = false;
    if (isHdr) {
      readOk = this.m_loader.readFromBufferHeader(volDst, strContent, callbackProgress, callbackComplete);
    } else {
      readOk = this.m_loader.readFromBufferImage(volDst, strContent, callbackProgress, callbackComplete);
    }

    if (readOk && (this.m_fileIndex === this.m_numFiles)) {
      let ok = false;
      if (this.m_numFiles === VALID_NUM_FILES_2) {
        ok = this.m_loader.createVolumeFromHeaderAndImage(this.m_volume);
      } else if (this.m_numFiles === VALID_NUM_FILES_4) {
        // intensity data 16 -> 8 bpp
        ok = this.m_loader.createVolumeFromHeaderAndImage(this.m_volume);
        if (ok) {
          // mix 8 bpp intensity and roi pixels
          ok = this.m_loader.createRoiVolumeFromHeaderAndImage(this.m_volume, this.m_volumeRoi);
        }
      }
      this.callbackReadProgress(1.0);
      if (!ok) {
        this.callbackReadComplete(LoadResult.FAIL);
      } else {
        this.callbackReadComplete(LoadResult.SUCCESS);
      }
    }

    // read again new file
    if (this.m_fileIndex < this.m_numFiles) {
      this.callbackReadProgress(ratioLoad);
      this.m_fileReader.onloadend = this.onFileContentReadMultipleHdr;
      const file = this.m_files[this.m_fileIndex];
      this.m_fileName = file.name;
      this.m_fileReader.readAsArrayBuffer(file);
    }

  }
  //
  // read from string content in this.m_fileReader.result
  //
  onFileContentReadMultipleDicom() {
    // console.log('UiOpenMenu. onFileContentReadMultipleDicom ...');
    const strContent = this.m_fileReader.result;
    this.m_fileIndex++;
    const ratioLoad = this.m_fileIndex / this.m_numFiles;
    // console.log(`onFileContentReadMultipleDicom. r = ${ratioLoad}`);
    const callbackProgress = null;
    // const callbackComplete = this.callbackReadMultipleComplete;

    if (this.m_fileIndex <= 1) {
      this.callbackReadProgress(0.0);
    }

    const callbackColmpleteVoid = undefined;
    const readStatus = this.m_volume.readSingleSliceFromDicom(this.m_loader, this.m_fileIndex - 1, 
      this.m_fileName, ratioLoad, strContent, callbackProgress, callbackColmpleteVoid);
    if (readStatus !== LoadResult.SUCCESS) {
      console.log('onFileContentReadMultipleDicom. Error read individual file');
    }
    if ( (readStatus === LoadResult.SUCCESS) && (this.m_fileIndex === this.m_numFiles)) {
      this.m_loader.createVolumeFromSlices(this.m_volume);
      this.finalizeSuccessLoadedVolume(this.m_volume, this.m_fileName);
      console.log(`onFileContentReadMultipleDicom read all ${this.m_numFiles} files`);

      this.callbackReadProgress(1.0);
      this.callbackReadComplete(LoadResult.SUCCESS);
    }
    // read again new file
    if (this.m_fileIndex < this.m_numFiles) {
      // print console loading progress
      const NUM_PARTS_REPORT = 16;
      const STEP_PROGRESS = Math.floor(this.m_numFiles / NUM_PARTS_REPORT);
      if ((this.m_fileIndex % STEP_PROGRESS) === 0) {
        // console.log(`onFileContentReadMultipleDicom. Loading completed = ${ratioLoad}`);
        this.callbackReadProgress(ratioLoad);
      }

      this.m_fileReader.onloadend = this.onFileContentReadMultipleDicom;
      const file = this.m_files[this.m_fileIndex];
      this.m_fileName = file.name;
      this.m_fileReader.readAsArrayBuffer(file);
    }
  }
  //
  // Perform open file after it selected in dialog
  handleFileSelected(evt) {
    if (evt.target.files !== undefined) {
      const numFiles = evt.target.files.length;
      console.log(`UiOpenMenu. Trying to open ${numFiles} files`);
      console.log(`UiOpenMenu. handleFileSelected. file[0] = ${evt.target.files[0].name}`);
      if (numFiles === 1) {
        const file = evt.target.files[0];
        this.m_fileName = file.name;
        this.m_fileReader = new FileReader();
        this.m_fileReader.onloadend = this.onFileContentReadSingleFile;
        this.m_fileReader.readAsArrayBuffer(file);
      } else {
        // not single file was open
        this.m_files = evt.target.files;
        this.m_fileIndex = 0;
        this.m_numFiles = numFiles;
        this.m_fileReader = new FileReader();
        // if multiple files, create Dicom loader
        this.m_loader = null;
        if (evt.target.files[0].name.endsWith(".dcm")) {
          this.m_loader = new LoaderDicom(numFiles);
          const dicomInfo = this.m_loader.m_dicomInfo;

          // save dicomInfo to store
          const store = this.props;
          store.dispatch({ type: StoreActionType.SET_DICOM_INFO, dicomInfo: dicomInfo });


          this.m_fileReader.onloadend = this.onFileContentReadMultipleDicom;
        } else if ((evt.target.files[0].name.endsWith(".hdr")) || (evt.target.files[0].name.endsWith(".img"))) {
          this.m_loader = new LoaderHdr(numFiles);
          this.m_fileReader.onloadend = this.onFileContentReadMultipleHdr;
        }
        
        const vol = new Volume();
        this.m_volume = vol;
        this.m_volumeRoi = null;

        const file = evt.target.files[0];
        this.m_fileName = file.name;
        this.m_fileReader.readAsArrayBuffer(file);
      } // if num files > 1
    } // if event is mnot empty
  }
  buildFileSelector() {
    const fileSelector = document.createElement('input');
    fileSelector.setAttribute('type', 'file');
    fileSelector.setAttribute('accept', '.ktx,.dcm,.nii,.hdr,.h,.img');
    fileSelector.setAttribute('multiple', '');
    fileSelector.onchange = this.handleFileSelected;
    return fileSelector;
  }
  // invoked after render
  componentDidMount() {
    this.m_fileSelector = this.buildFileSelector();
  }
  onButtonLocalFile(evt) {
    evt.preventDefault();
    this.m_fileSelector.click();
  }
  //
  onModalUrlShow() {
    console.log(`onModalUrlShow`);
    this.setState({ strUrl: '' }); 
    this.setState({ showModalUrl: true });
  }
  onModalUrlHide() {
    console.log(`onModalUrlHide`);
    this.setState({ showModalUrl: false });
  }
  onChangeUrlString(evt) {
    const str = evt.target.value;
    this.setState({ strUrl: str }); 
    console.log(`onChangeUrlString. str = ${str}`)
  }
  callbackReadCompleteUrlKtxNii(codeResult) {
    if (codeResult !== LoadResult.SUCCESS) {
      console.log(`onCompleteFromUrlKtx. Bad result: ${codeResult}`);

      const arrErrors = [];
      const strErr = LoadResult.getResultString(codeResult);
      arrErrors.push(strErr);
      this.finalizeFailedLoadedVolume(this.m_volume, this.m_fileName, arrErrors);
      return;
    } else {
      this.finalizeSuccessLoadedVolume(this.m_volume, this.m_fileName);
      this.callbackReadComplete(LoadResult.SUCCESS, null, 0, null);
    }
  }
  loadFromUrl(strUrl) {
    const fileTools = new FileTools();
    const isValid = fileTools.isValidUrl(strUrl);
    if (isValid) {
      this.m_url = strUrl;

      this.m_fileName = fileTools.getFileNameFromUrl(strUrl);

      if (strUrl.endsWith('.ktx')) {
        this.m_volume = new Volume();
        const callbackProgress = this.callbackReadProgress;
        const callbackComplete = this.callbackReadCompleteUrlKtxNii;
        this.callbackReadProgress(0.0);
        this.m_volume.readFromKtxUrl(strUrl, callbackProgress, callbackComplete);
        // if KTX
      } else if (strUrl.endsWith('.nii')) {
        this.m_volume = new Volume();
        const callbackProgress = this.callbackReadProgress;
        const callbackComplete = this.callbackReadCompleteUrlKtxNii;
        this.callbackReadProgress(0.0);
        this.m_volume.readFromNiiUrl(strUrl, callbackProgress, callbackComplete);
        // if NII (Nifti format)
      } else if (strUrl.endsWith('.dcm')) {
        this.m_volume = new Volume();
        const callbackProgress = this.callbackReadProgress;
        const callbackComplete = this.callbackReadCompleteUrlKtxNii;
        this.callbackReadProgress(0.0);
        this.m_volume.readFromDicomUrl(strUrl, callbackProgress, callbackComplete);
        // if Dicom
      } else if (strUrl.endsWith('.h')) {
        this.m_volume = new Volume();
        const callbackProgress = this.callbackReadProgress;
        const callbackComplete = this.callbackReadCompleteUrlKtxNii;
        this.callbackReadProgress(0.0);
        this.m_volume.readFromHdrUrl(strUrl, callbackProgress, callbackComplete);
        // if Hdr
      } else {
        console.log(`UiOpenMenu. Unknow file type from URL = ${strUrl}`);
      }

      // if valid url
    } else {
      const strErr = `UiOpenMenu. Bad URL = ${strUrl}`;
      console.log(strErr);
      this.setErrorString(strErr);
    }
  }
  onClickLoadUrl() {
    this.setState({ showModalUrl: false });
    const strUrl = this.state.strUrl;
    console.log(`onClickLoadUrl with strUrl = ${strUrl}`);
    this.loadFromUrl(strUrl);
  }
  //
  onModalDemoOpenShow() {
    this.setState({ showModalDemo: true });
  }
  onModalDemoOpenHide() {
    this.setState({ showModalDemo: false });
  }
  arrNumToStr(arrNums) {
    const numLet = arrNums.length;
    let str = '';
    for (let i = 0; i < numLet; i++) {
      const n = arrNums[i];
      str = str.concat( String.fromCharCode(n) );
    }
    return str;
  }
  onModalGoogleShow() {
    this.setState({ showModalGoogle: true });
  }
  onModalGoogleHide() {
    this.setState({ showModalGoogle: false });
  }
  listSeries(client, onStudyIDCaptured) {
    const projectId = 'wide-journey-237913';
    const cloudRegion = 'europe-west2';
    const dicomDataset = 'TestDicom1';
    const dicomStore = 'TestDicomStorage2';
    const parentName = `projects/${projectId}/locations/${cloudRegion}/datasets/${dicomDataset}/dicomStores/${dicomStore}`;
    const studyIdTag = '0020000D';
    
    let studyIdArray = []
    const request = { 
      parent: parentName,
      dicomWebPath: 'studies' 
    };
    client.healthcare.projects.locations.datasets.dicomStores
      .searchForStudies(request)
      .then(studies => {
        //console.log('Request successful:\n');
        //console.log(JSON.stringify(studies, null, 2));
        for (let i = 0; i < studies.result.length; i++) {
          studyIdArray.push(studies.result[i][studyIdTag].Value);
        }
        onStudyIDCaptured(studyIdArray);
      })
      .catch(err => {
        console.error(err);
      });
  }
  toDicomWebQIDOUrl(path, googleAuth) {
    return path + '?access_token=' +
      googleAuth.currentUser.get().getAuthResponse(true).access_token;
  }
  listInstancesInSeries(studyId, client, googleAuth, onUrlCaptured) {
    const projectId = 'wide-journey-237913';
    const cloudRegion = 'europe-west2';
    const dicomDataset = 'TestDicom1';
    const dicomStore = 'TestDicomStorage2';
    const PrefixURL = 'https://healthcare.googleapis.com/v1beta1/';
    const parentName = `projects/${projectId}/locations/${cloudRegion}/datasets/${dicomDataset}/dicomStores/${dicomStore}`;
    const dicomWebPath = 'studies';
    const studyName = `${dicomWebPath}/${studyId}`;
    // const seriesName = `${studyName}/series/1.3.6.1.4.1.25403.158515237678667.5060.20130807021436.5/instances`;

    const SOP_INSTANCE_UID_TAG = '00080018';
    const request = { 
      parent: parentName,
      dicomWebPath: `${studyName}/series` 
    };
    let urlArray = []
    console.log('Requesting series..');
    //client.healthcare.projects.locations.datasets.dicomStores.studies.retrieveStudy(request)
    client.healthcare.projects.locations.datasets.dicomStores.studies.searchForSeries(request)      
      .then(series => {
        console.log(JSON.stringify(series, null, 2));
        const SOP_SERIES_UID_TAG = '0020000E';
        const seriesName = `${studyName}/series/${series.result[0][SOP_SERIES_UID_TAG].Value}/instances`;
        
        const request = { 
          parent: parentName,
          dicomWebPath: seriesName 
        };
        client.healthcare.projects.locations.datasets.dicomStores.studies.series.retrieveSeries(request)      
          .then(instances => {
            for (let i = 0; i < instances.result.length; i++) {
              const dcmPath = `${PrefixURL}${parentName}/dicomWeb/${seriesName}/${instances.result[i][SOP_INSTANCE_UID_TAG].Value}`;
              //console.log(`${this.toDicomWebQIDOUrl(dcmPath, googleAuth)}\n`)
              urlArray.push(this.toDicomWebQIDOUrl(dcmPath, googleAuth));
              //console.log(`${dcmPath}\n`)
            }
            onUrlCaptured(urlArray);
          })
          .catch(err => {
            console.error(err);
          });
      })
      .catch(err => {
        console.error(err);
      });    
  }
  loadGoogleDicom(index, client, googleAuth) {
    if (client !== null) {
      
      this.listSeries(client, (studyList) => {
        //console.log(`Requesting instances for ${studyList[index]}`);
        this.listInstancesInSeries(studyList[index], client, googleAuth, (urlArray) => {
          //this.props.urlArray = urlArray;
          
          const store = this.props;
          const loader = new LoaderUrlDicom(store);
          const READ_FROM_GOOGLE = true;
          loader.loadFromUrlArray(urlArray, READ_FROM_GOOGLE);
        })
      });
    }
  }
  onGoogleSelected(index) {
    const store = this.props;
    console.log(`TODO: onGoogleSelected(${index}) ... `);
    //store.App.loadGoogleDicom();
    //console.log(JSON.stringify(store.googleApi.client, null, 2));
    //console.log(JSON.stringify(store.googleApi.auth, null, 2));
    this.loadGoogleDicom(index, store.googleApi.client, store.googleApi.auth);
    // TODO: perform action on click i-th item in Google cloud menu
  }
  onDemoSelected(index) {
    let fileName = '';
    if (index === 0) {
      // 20101108.ktx
      const FN_ENCODED = 'http://www.e-joufs.sv/qsjwbuf/nfe4xfc/ebub/luy/31212219.luy';
      const ft = new FileTools();
      fileName = ft.decodeUrl(FN_ENCODED);
      // console.log(`onDemoSelected. enc = ${fileName}`);
    } else if (index === 1) {
      // set00.ktx
      const FN_ENCO = 'http://www.e-joufs.sv/qsjwbuf/nfe4xfc/ebub/luy/tfu11.luy';
      const ft = new FileTools();
      fileName = ft.decodeUrl(FN_ENCO);
      // console.log(`onDemoSelected. enc = ${fileName}`);
    } else if (index === 2) {
      // gm3 nii
      const FN_GM_ENCODED = 'http://www.e-joufs.sv/qsjwbuf/nfe4xfc/ebub/ojguj/hn4_623_623_276.ojj';
      const ft = new FileTools();
      fileName = ft.decodeUrl(FN_GM_ENCODED);
      // fileName = ft.encodeUrl(FN_GM_DECODED);
      // console.log(`onDemoSelected. enc = ${fileName}`);
    } else if (index === 3) {
      const numUrls = config.demoWomanPelvisUrls.length;
      if (numUrls === 0) {
        // woman pelvis
        const FN_WOMM_ENCODED = 'http://www.e-joufs.sv/qsjwbuf/nfe4xfc/ebub/ejdpn/xpnbo_qfmwjt/wig.:12.edn';
        const ft = new FileTools();
        fileName = ft.decodeUrl(FN_WOMM_ENCODED);
      } else {
        const strPrefix = config.demoWomanPelvisPrefix;
        // console.log(`config. prefix = ${strPrefix}`);
        const arrFileNames = [];
        for (let i = 0; i < numUrls; i++) {
          const strFn = config.demoWomanPelvisUrls[i];
          const url = `${strPrefix}${strFn}`;
          arrFileNames.push(url);
        }
        const store = this.props;
        const loader = new LoaderUrlDicom(store);
        const GOOGLE_HEADER = false;
        loader.loadFromUrlArray(arrFileNames, GOOGLE_HEADER);
        return;
      }
    } else if (index === 4) {
      const numUrls = config.demoLungsUrls.length;
      if (numUrls === 0) {
        // lungs dicom 00cba..957e.dcm
        const FN_OCB_ENCODED = 'http://www.e-joufs.sv/qsjwbuf/nfe4xfc/ebub/ejdpn/11dcb1:2gb5be73dd4311b768bfc:68f/145784245dcfg6fb26gg:f1d91:1611b.edn';
        const ft = new FileTools();
        fileName = ft.decodeUrl(FN_OCB_ENCODED);
      } else {
        const strPrefix = config.demoLungsPrefix;
        console.log(`config. Lungs prefix = ${strPrefix}`);
        const arrFileNames = [];
        for (let i = 0; i < numUrls; i++) {
          const strFn = config.demoLungsUrls[i];
          const url = `${strPrefix}${strFn}`;
          arrFileNames.push(url);
        }
        const store = this.props;
        const loader = new LoaderUrlDicom(store);
        const GOOGLE_HEADER = false;
        loader.loadFromUrlArray(arrFileNames, GOOGLE_HEADER);
        return;
      }
    } else if (index === 5) {
      // ct_256_256_256.ktx
      const FN_CT256_ENCODED = 'http://www.e-joufs.sv/qsjwbuf/nfe4xfc/ebub/luy/du_367_367_367.luy';
      const ft = new FileTools();
      fileName = ft.decodeUrl(FN_CT256_ENCODED);
      // fileName = ft.encodeUrl(FN_CT256_DECODED);
      // console.log(`onDemoSelected. enc = ${fileName}`);
    } else if (index === 6) {
      // lungs_256_256_256.ktx
      const FN_LUNGS256_ENCODED = 'http://www.e-joufs.sv/qsjwbuf/nfe4xfc/ebub/luy/mvoht_367_367_367.luy';
      const ft = new FileTools();
      fileName = ft.decodeUrl(FN_LUNGS256_ENCODED);
      // fileName = ft.encodeUrl(FN_LUNGS256_DECODED);
      // console.log(`onDemoSelected. enc = ${fileName}`);
    } else if (index === 7) {
      // hdr set (roi)
      //const FN_HDRSET_DECODED = 'http://www.d-inter.ru/private/med3web/data/hdr/set_intn.h';
      const FN_HDRSET_ENCODED = 'http://www.e-joufs.sv/qsjwbuf/nfe4xfc/ebub/ies/tfu_jouo.i';
      const ft = new FileTools();
      fileName = ft.decodeUrl(FN_HDRSET_ENCODED);
    } else {
      console.log(`onDemoSelected. not implemented for index = ${index}`);
    }
    if (fileName.length > 0) {
      console.log(`onDemoSelected: load file ${fileName}, index = ${index}`);
      this.loadFromUrl(fileName);
    } // if fileName not empty
  } // end of onDemoSelected
  //
  shouldComponentUpdate() {
    return true;
  }
  render() {
    const isGoogle = config.googleCloudDemoActivce;

    const jsGoo = (isGoogle) ? 
      <NavDropdown.Item onClick={this.onModalGoogleShow} >
        <i className="fas fa-brain"></i>
        Google cloud models
      </NavDropdown.Item> : 
      <p></p>;


    const jsxOpenMenu =
      <NavDropdown id="basic-nav-dropdown" title={
        <div style={{ display: 'inline-block' }}> 
          <i className="fas fa-folder-open"></i>
          Open
        </div>
      } >
        <NavDropdown.Item href="#actionOpenComputer" onClick={evt => this.onButtonLocalFile(evt)}>
          <i className="fas fa-desktop"></i>
          Computer
        </NavDropdown.Item>
        <NavDropdown.Item href="#actionOpenUrl" onClick={this.onModalUrlShow} >
          <i className="fas fa-globe-americas"></i>
          Url
        </NavDropdown.Item>

        <NavDropdown.Divider />

        {jsGoo}

        <NavDropdown.Item href="#actionOpenDemo" onClick={this.onModalDemoOpenShow} >
          <i className="fas fa-brain"></i>
          Demo models Open
        </NavDropdown.Item>

        <Modal show={this.state.showModalUrl} onHide={this.onModalUrlHide} >
          <Modal.Title>
            Load data from external source
          </Modal.Title>

          <Modal.Header closeButton>
            <Modal.Body>

              <InputGroup className="mb-3">
                <InputGroup.Prepend>
                  <InputGroup.Text id="inputGroup-sizing-default">
                    Input URL to open
                  </InputGroup.Text>
                </InputGroup.Prepend>
                <FormControl
                  placeholder="Enter URL here"
                  aria-label="Default"
                  aria-describedby="inputGroup-sizing-default"
                  onChange={this.onChangeUrlString.bind(this)} />
                <InputGroup.Append>
                  <Button variant="outline-secondary" onClick={this.onClickLoadUrl}>
                    Load
                  </Button>
                </InputGroup.Append>
              </InputGroup>

            </Modal.Body>
          </Modal.Header>
        </Modal>

        <UiModalDemo stateVis={this.state.showModalDemo}
          onHide={this.onModalDemoOpenHide} onSelectDemo={this.onDemoSelected}  />
        <UiModalGoogle stateVis={this.state.showModalGoogle}
          onHide={this.onModalGoogleHide} onSelectDemo={this.onGoogleSelected}  
          arrMenu={config.arrMenuGoogle}/>

      </NavDropdown>

    return jsxOpenMenu;
  }
}

export default connect(store => store)(UiOpenMenu);
